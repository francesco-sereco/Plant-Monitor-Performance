import { describe, it, expect, vi, afterEach } from "vitest";
import { getGroqEnv } from "../../lib/env.js";
import { GroqNotConfiguredError, DEFAULT_GROQ_MODEL } from "./groq.client.js";
import { pingAi } from "./ai.service.js";

vi.mock("../../lib/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/env.js")>();
  return { ...actual, getGroqEnv: vi.fn() };
});

describe("pingAi", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("throws GroqNotConfiguredError when GROQ_API_KEY is missing", async () => {
    vi.mocked(getGroqEnv).mockReturnValue({ apiKey: "", model: DEFAULT_GROQ_MODEL });

    await expect(pingAi("test")).rejects.toBeInstanceOf(GroqNotConfiguredError);
  });

  it("returns parsed reply when Groq responds", async () => {
    vi.mocked(getGroqEnv).mockReturnValue({
      apiKey: "test-key",
      model: DEFAULT_GROQ_MODEL,
    });

    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: DEFAULT_GROQ_MODEL,
        choices: [{ message: { content: "Risposta di test." } }],
        usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 },
      }),
    });

    const result = await pingAi("Ciao", { fetchFn });

    expect(result.reply).toBe("Risposta di test.");
    expect(result.model).toBe(DEFAULT_GROQ_MODEL);
    expect(fetchFn).toHaveBeenCalledOnce();
  });
});
