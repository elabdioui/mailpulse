import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  isRequestAuthenticated,
  SESSION_COOKIE_NAME,
  verifyApiToken,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth";

describe("verifyPassword", () => {
  it("accepts the configured ADMIN_PASSWORD", () => {
    expect(verifyPassword("test-password")).toBe(true);
  });

  it("rejects any other password", () => {
    expect(verifyPassword("wrong-password")).toBe(false);
    expect(verifyPassword("")).toBe(false);
    expect(verifyPassword("test-password-extra")).toBe(false);
  });
});

describe("verifyApiToken", () => {
  it("accepts the configured API_TOKEN", () => {
    expect(verifyApiToken("test-api-token")).toBe(true);
  });

  it("rejects any other token", () => {
    expect(verifyApiToken("wrong-token")).toBe(false);
  });
});

describe("session token", () => {
  it("round-trips through create and verify", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it("rejects a garbage token", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const { SignJWT } = await import("jose");
    const badToken = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(new TextEncoder().encode("a-completely-different-secret-32-chars"));
    expect(await verifySessionToken(badToken)).toBe(false);
  });
});

describe("isRequestAuthenticated", () => {
  function requestWith(init: { cookie?: string; authorization?: string }) {
    const headers = new Headers();
    if (init.cookie) headers.set("cookie", init.cookie);
    if (init.authorization) headers.set("authorization", init.authorization);
    return new NextRequest("https://t.example.dev/api/emails", { headers });
  }

  it("authenticates a valid session cookie", async () => {
    const token = await createSessionToken();
    const request = requestWith({ cookie: `${SESSION_COOKIE_NAME}=${token}` });
    expect(await isRequestAuthenticated(request)).toBe(true);
  });

  it("authenticates a valid Bearer API token", async () => {
    const request = requestWith({ authorization: "Bearer test-api-token" });
    expect(await isRequestAuthenticated(request)).toBe(true);
  });

  it("rejects an invalid Bearer token", async () => {
    const request = requestWith({ authorization: "Bearer wrong-token" });
    expect(await isRequestAuthenticated(request)).toBe(false);
  });

  it("rejects a request with neither cookie nor Bearer token", async () => {
    const request = requestWith({});
    expect(await isRequestAuthenticated(request)).toBe(false);
  });

  it("rejects an invalid session cookie", async () => {
    const request = requestWith({ cookie: `${SESSION_COOKIE_NAME}=garbage` });
    expect(await isRequestAuthenticated(request)).toBe(false);
  });
});
