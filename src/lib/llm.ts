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

// OpenAI で回答を生成
async function generateAnswerWithOpenAI(
  query: string,
  context: string
): Promise<string> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const systemMessage =
    "あなたは親切なAIアシスタントです。提供された情報を元に、正確で分かりやすい回答を提供してください。";

  const prompt = `以下の情報を参考にして、質問に答えてください。

【参考情報】
${context}

【質問】
${query}

【回答】`;

  console.log("[OpenAI Chat Request]");
  console.log("Model:", model);
  console.log("System message:", systemMessage);
  console.log("Query(question):", query);
  console.log("Context:", context);
  console.log("Prompt:", prompt);

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  console.log("[OpenAI Chat Response]");
  console.log(
    "Response length:",
    response.choices[0].message.content?.length || 0
  );
  console.log(
    "Response preview:",
    response.choices[0].message.content?.substring(0, 100)
  );

  return response.choices[0].message.content || "回答を生成できませんでした。";
}

// AWS Bedrock (Claude) で回答を生成
async function generateAnswerWithBedrock(
  query: string,
  context: string
): Promise<string> {
  const client = getBedrockClient();
  const modelId =
    process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0";

  const prompt = `以下の情報を参考にして、質問に答えてください。

【参考情報】
${context}

【質問】
${query}

【回答】`;

  const input = {
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    }),
  };

  const command = new InvokeModelCommand(input);
  const response = await client.send(command);

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.content[0].text || "回答を生成できませんでした。";
}

// 回答生成（プロバイダーに応じて自動切り替え）
export async function generateAnswer(
  query: string,
  context: string
): Promise<string> {
  if (LLM_PROVIDER === "bedrock") {
    return generateAnswerWithBedrock(query, context);
  }
  return generateAnswerWithOpenAI(query, context);
}
