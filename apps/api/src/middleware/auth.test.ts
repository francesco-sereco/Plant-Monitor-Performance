import { describe, it, expect, beforeAll, afterAll } from "vitest";

function isAuthEnabled() {
  return process.env.AUTH_ENABLED === "true";
}

function requireWriteAccess(role?: string): { allowed: boolean; status?: number } {
  if (!isAuthEnabled()) return { allowed: true };
  if (!role || role === "commerciale") return { allowed: false, status: 403 };
  return { allowed: true };
}

describe("write access permissions", () => {
  const original = process.env.AUTH_ENABLED;

  beforeAll(() => {
    process.env.AUTH_ENABLED = "true";
  });

  afterAll(() => {
    process.env.AUTH_ENABLED = original;
  });

  it("blocks commerciale from write", () => {
    const result = requireWriteAccess("commerciale");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });

  it("allows assistenza to write", () => {
    expect(requireWriteAccess("assistenza").allowed).toBe(true);
  });

  it("allows admin to write", () => {
    expect(requireWriteAccess("admin").allowed).toBe(true);
  });
});

describe("write access when auth disabled", () => {
  const original = process.env.AUTH_ENABLED;

  beforeAll(() => {
    process.env.AUTH_ENABLED = "false";
  });

  afterAll(() => {
    process.env.AUTH_ENABLED = original;
  });

  it("allows all when auth disabled", () => {
    expect(requireWriteAccess("commerciale").allowed).toBe(true);
  });
});
