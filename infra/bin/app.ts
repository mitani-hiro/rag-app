#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { RagAppStack } from "../lib/rag-app-stack";

const app = new cdk.App();

const environmentName = app.node.tryGetContext("environmentName") || "dev";
const awsRegion = app.node.tryGetContext("region") || "us-east-1";

new RagAppStack(app, `RagAppStack-${environmentName}`, {
  environmentName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: awsRegion,
  },
  description: `RAG Application Stack (${environmentName})`,
});

app.synth();
