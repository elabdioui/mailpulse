import { beforeEach, describe, expect, it, vi } from "vitest";

interface StoredCookie {
  value: string;
  options?: Record<string, unknown>;
}

const store = new Map<string, StoredCookie>();

const cookieStore = {
  get: (name: string) => {
    const found = store.get(name);
    return found ? { name, value: found.value } : undefined;
  },
  set: (name: string, value: string, options?: Record<string, unknown>) => {
    store.set(name, { value, options });
  },
  delete: (name: string) => {
    store.delete(name);
  },
};

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

const {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  clearSessionCookie,
  hasValidSession,
  setSessionCookie,
} = await import("@/lib/auth");

describe("session cookie", () => {
  beforeEach(() => {
    store.clear();
  });

  it("is httpOnly, SameSite=Lax, and expires in 30 days", () => {
    expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(SESSION_COOKIE_OPTIONS.sameSite).toBe("lax");
    expect(SESSION_COOKIE_OPTIONS.maxAge).toBe(60 * 60 * 24 * 30);
  });

  it("hasValidSession is false with no cookie set", async () => {
    expect(await hasValidSession()).toBe(false);
  });

  it("setSessionCookie makes hasValidSession true", async () => {
    await setSessionCookie();
    expect(store.has(SESSION_COOKIE_NAME)).toBe(true);
    expect(await hasValidSession()).toBe(true);
  });

  it("clearSessionCookie removes it", async () => {
    await setSessionCookie();
    await clearSessionCookie();
    expect(store.has(SESSION_COOKIE_NAME)).toBe(false);
    expect(await hasValidSession()).toBe(false);
  });
});
