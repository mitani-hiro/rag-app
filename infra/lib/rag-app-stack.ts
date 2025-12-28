import * as cdk from "aws-cdk-lib";
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface RagAppStackProps extends cdk.StackProps {
  environmentName: string;
}

export class RagAppStack extends cdk.Stack {
  public readonly appRunnerServiceUrl: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: RagAppStackProps) {
    super(scope, id, props);

    const { environmentName } = props;

    // Using public ECR: public.ecr.aws/h7f0r1p2/rag-app
    const publicEcrImageUri = "public.ecr.aws/h7f0r1p2/rag-app:latest";

    // IAM Role for App Runner instance (runtime)
    const instanceRole = new iam.Role(this, "AppRunnerInstanceRole", {
      assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
      roleName: `rag-app-instance-role-${environmentName}`,
    });

    // Grant Bedrock access
    instanceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.*`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-*`,
        ],
      })
    );

    // Auto Scaling Configuration
    const autoScalingConfig = new apprunner.CfnAutoScalingConfiguration(
      this,
      "RagAppAutoScaling",
      {
        autoScalingConfigurationName: `rag-app-autoscaling-${environmentName}`,
        maxConcurrency: 100,
        maxSize: 2,
        minSize: 1,
      }
    );

    // App Runner Service
    const appRunnerService = new apprunner.CfnService(this, "RagAppService", {
      serviceName: `rag-app-${environmentName}`,
      sourceConfiguration: {
        autoDeploymentsEnabled: false,
        imageRepository: {
          imageIdentifier: publicEcrImageUri,
          imageRepositoryType: "ECR_PUBLIC",
          imageConfiguration: {
            port: "3000",
            runtimeEnvironmentVariables: [
              { name: "NODE_ENV", value: "production" },
              { name: "LLM_PROVIDER", value: "bedrock" },
              { name: "DATABASE_ENABLED", value: "false" },
              { name: "AWS_REGION", value: this.region },
              { name: "BEDROCK_MODEL_ID", value: "anthropic.claude-3-haiku-20240307-v1:0" },
              { name: "BEDROCK_EMBEDDING_MODEL_ID", value: "amazon.titan-embed-text-v2:0" },
            ],
          },
        },
      },
      instanceConfiguration: {
        cpu: "0.25 vCPU",
        memory: "0.5 GB",
        instanceRoleArn: instanceRole.roleArn,
      },
      healthCheckConfiguration: {
        protocol: "HTTP",
        path: "/",
        interval: 20,
        timeout: 5,
        healthyThreshold: 1,
        unhealthyThreshold: 5,
      },
      autoScalingConfigurationArn: autoScalingConfig.attrAutoScalingConfigurationArn,
    });

    // Outputs
    this.appRunnerServiceUrl = new cdk.CfnOutput(this, "AppRunnerServiceUrl", {
      value: `https://${appRunnerService.attrServiceUrl}`,
      description: "App Runner Service URL",
      exportName: `RagAppServiceUrl-${environmentName}`,
    });

    new cdk.CfnOutput(this, "EcrRepositoryUri", {
      value: publicEcrImageUri,
      description: "Public ECR Repository URI",
      exportName: `RagAppEcrUri-${environmentName}`,
    });
  }
}
