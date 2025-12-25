import OpenAI from "openai";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const LLM_PROVIDER = process.env.LLM_PROVIDER || "openai";

// OpenAI クライアント
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// AWS Bedrock クライアント
let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return bedrockClient;
}

// OpenAI で埋め込みを生成
async function generateEmbeddingWithOpenAI(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

  console.log("[OpenAI Embedding Request]");
  console.log("Model:", model);
  console.log("Input text:", text);
  console.log("Input text preview:", text.substring(0, 100));

  const response = await client.embeddings.create({
    model,
    input: text,
  });

  console.log("[OpenAI Embedding Response]");
  console.log("Model:", response.model);
  console.log("Embedding dimension:", response.data[0].embedding.length);

  return response.data[0].embedding;
}

// AWS Bedrock で埋め込みを生成
async function generateEmbeddingWithBedrock(text: string): Promise<number[]> {
  const client = getBedrockClient();
  const modelId =
    process.env.BEDROCK_EMBEDDING_MODEL_ID || "amazon.titan-embed-text-v2:0";

  const input = {
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      inputText: text,
    }),
  };

  const command = new InvokeModelCommand(input);
  const response = await client.send(command);

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.embedding;
}

// 埋め込み生成（プロバイダーに応じて自動切り替え）
export async function generateEmbedding(text: string): Promise<number[]> {
  if (LLM_PROVIDER === "bedrock") {
    return generateEmbeddingWithBedrock(text);
  }
  return generateEmbeddingWithOpenAI(text);
}

// 埋め込みの次元数を取得
export function getEmbeddingDimension(): number {
  if (LLM_PROVIDER === "bedrock") {
    // Titan Embed Text v2 は 1024 次元
    return 1024;
  }
  // OpenAI text-embedding-3-small は 1536 次元
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  if (model === "text-embedding-3-large") {
    return 3072;
  }
  return 1536;
}
