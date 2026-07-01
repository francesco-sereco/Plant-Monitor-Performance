import { getGroqEnv } from "../../lib/env.js";
import {
  groqChatCompletion,
  GroqApiError,
  GroqNotConfiguredError,
  type GroqChatResult,
} from "./groq.client.js";

export function isGroqConfigured(): boolean {
  return Boolean(getGroqEnv().apiKey);
}

export async function pingAi(
  message: string,
  options?: { fetchFn?: typeof fetch }
): Promise<GroqChatResult> {
  const { apiKey, model } = getGroqEnv();
  if (!apiKey) {
    throw new GroqNotConfiguredError();
  }

  return groqChatCompletion({
    apiKey,
    model,
    userMessage: message,
    fetchFn: options?.fetchFn,
  });
}

export { GroqApiError, GroqNotConfiguredError };
