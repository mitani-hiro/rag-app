import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface RagAppStackProps extends cdk.StackProps {
  environmentName: string;
}

export class RagAppStack extends cdk.Stack {
  public readonly appRunnerServiceUrl: cdk.CfnOutput;
  public readonly ecrRepositoryUri: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: RagAppStackProps) {
    super(scope, id, props);

    const { environmentName } = props;

    // ECR Repository for Docker images
    const ecrRepository = new ecr.Repository(this, "RagAppRepository", {
      repositoryName: `rag-app-${environmentName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          maxImageCount: 5,
          description: "Keep only 5 images",
        },
      ],
    });

    // IAM Role for App Runner to access ECR
    const accessRole = new iam.Role(this, "AppRunnerAccessRole", {
      assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com"),
      roleName: `rag-app-access-role-${environmentName}`,
    });

    ecrRepository.grantPull(accessRole);

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
        authenticationConfiguration: {
          accessRoleArn: accessRole.roleArn,
        },
        autoDeploymentsEnabled: false,
        imageRepository: {
          imageIdentifier: `${ecrRepository.repositoryUri}:latest`,
          imageRepositoryType: "ECR",
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

    // Ensure App Runner waits for ECR repository
    appRunnerService.node.addDependency(ecrRepository);

    // Outputs
    this.appRunnerServiceUrl = new cdk.CfnOutput(this, "AppRunnerServiceUrl", {
      value: `https://${appRunnerService.attrServiceUrl}`,
      description: "App Runner Service URL",
      exportName: `RagAppServiceUrl-${environmentName}`,
    });

    this.ecrRepositoryUri = new cdk.CfnOutput(this, "EcrRepositoryUri", {
      value: ecrRepository.repositoryUri,
      description: "ECR Repository URI",
      exportName: `RagAppEcrUri-${environmentName}`,
    });
  }
}
