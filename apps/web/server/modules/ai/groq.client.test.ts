import { describe, it, expect, vi, afterEach } from "vitest";
import {
  groqChatCompletion,
  GroqApiError,
  GROQ_CHAT_URL,
  DEFAULT_GROQ_MODEL,
} from "./groq.client.js";

describe("groqChatCompletion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends Bearer auth and parses a successful response", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: DEFAULT_GROQ_MODEL,
        choices: [{ message: { content: "Il pH misura l'acidità." } }],
        usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
      }),
    });

    const result = await groqChatCompletion({
      apiKey: "test-key",
      model: DEFAULT_GROQ_MODEL,
      userMessage: "Cos'è il pH?",
      fetchFn,
    });

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(GROQ_CHAT_URL);
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(result.reply).toBe("Il pH misura l'acidità.");
    expect(result.usage.promptTokens).toBe(10);
    expect(result.usage.completionTokens).toBe(8);
  });

  it("throws GroqApiError on HTTP error", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Invalid API Key" } }),
    });

    await expect(
      groqChatCompletion({
        apiKey: "bad-key",
        model: DEFAULT_GROQ_MODEL,
        userMessage: "test",
        fetchFn,
      })
    ).rejects.toMatchObject({
      name: "GroqApiError",
      status: 401,
    });
  });

  it("throws GroqApiError when response has no content", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
    });

    await expect(
      groqChatCompletion({
        apiKey: "test-key",
        model: DEFAULT_GROQ_MODEL,
        userMessage: "test",
        fetchFn,
      })
    ).rejects.toBeInstanceOf(GroqApiError);
  });
});
