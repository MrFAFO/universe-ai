import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

function getRequiredEnv(name: "OPENAI_API_KEY" | "OPENAI_MODEL"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: getRequiredEnv("OPENAI_API_KEY"),
    });
  }

  return client;
}

export function getOpenAIModel(): string {
  return getRequiredEnv("OPENAI_MODEL");
}
