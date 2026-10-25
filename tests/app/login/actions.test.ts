import { beforeEach, describe, expect, it, vi } from "vitest";

const setSessionCookie = vi.fn();
const clearSessionCookie = vi.fn();
const verifyPassword = vi.fn();
vi.mock("@/lib/auth", () => ({
  setSessionCookie: (...args: unknown[]) => setSessionCookie(...args),
  clearSessionCookie: (...args: unknown[]) => clearSessionCookie(...args),
  verifyPassword: (...args: unknown[]) => verifyPassword(...args),
}));

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (...args: [string]) => redirect(...args),
}));

const { login, logout } = await import("@/app/(auth)/login/actions");

function formDataWith(password?: string) {
  const data = new FormData();
  if (password !== undefined) data.set("password", password);
  return data;
}

describe("login action", () => {
  beforeEach(() => {
    setSessionCookie.mockReset();
    verifyPassword.mockReset();
    redirect.mockClear();
    vi.useRealTimers();
  });

  it("returns a generic error and does not redirect on a wrong password", async () => {
    verifyPassword.mockReturnValue(false);
    const result = await login({}, formDataWith("wrong"));
    expect(result.error).toBe("Mot de passe incorrect.");
    expect(setSessionCookie).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns a generic error when no password is submitted", async () => {
    const result = await login({}, formDataWith());
    expect(result.error).toBe("Mot de passe incorrect.");
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("sets the session cookie and redirects to / on success", async () => {
    verifyPassword.mockReturnValue(true);
    await expect(login({}, formDataWith("correct"))).rejects.toThrow(
      "NEXT_REDIRECT:/",
    );
    expect(setSessionCookie).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("waits ~500ms before returning on failure", async () => {
    verifyPassword.mockReturnValue(false);
    const start = Date.now();
    await login({}, formDataWith("wrong"));
    expect(Date.now() - start).toBeGreaterThanOrEqual(450);
  });
});

describe("logout action", () => {
  beforeEach(() => {
    clearSessionCookie.mockReset();
    redirect.mockClear();
  });

  it("clears the session cookie and redirects to /login", async () => {
    await expect(logout()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(clearSessionCookie).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
