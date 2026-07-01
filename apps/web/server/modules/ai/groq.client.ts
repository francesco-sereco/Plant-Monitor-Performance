export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
export const DEFAULT_GROQ_TIMEOUT_MS = 15_000;

export type GroqUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type GroqChatResult = {
  model: string;
  reply: string;
  usage: GroqUsage;
};

type GroqApiResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

export class GroqNotConfiguredError extends Error {
  constructor() {
    super("GROQ_API_KEY non configurata");
    this.name = "GroqNotConfiguredError";
  }
}

export class GroqApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GroqApiError";
    this.status = status;
  }
}

export async function groqChatCompletion(params: {
  apiKey: string;
  model: string;
  userMessage: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}): Promise<GroqChatResult> {
  const fetchImpl = params.fetchFn ?? fetch;
  const timeoutMs = params.timeoutMs ?? DEFAULT_GROQ_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages: [{ role: "user", content: params.userMessage }],
        temperature: 0.2,
        max_tokens: 256,
      }),
      signal: controller.signal,
    });

    const body = (await response.json()) as GroqApiResponse;

    if (!response.ok) {
      const detail = body.error?.message ?? `HTTP ${response.status}`;
      throw new GroqApiError(detail, response.status);
    }

    const reply = body.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new GroqApiError("Risposta AI vuota o non valida", 502);
    }

    return {
      model: body.model ?? params.model,
      reply,
      usage: {
        promptTokens: body.usage?.prompt_tokens ?? 0,
        completionTokens: body.usage?.completion_tokens ?? 0,
        totalTokens: body.usage?.total_tokens ?? 0,
      },
    };
  } catch (error) {
    if (error instanceof GroqApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new GroqApiError("Timeout richiesta Groq", 504);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
