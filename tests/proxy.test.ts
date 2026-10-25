import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { proxy } from "@/proxy";

function requestFor(path: string, init: { cookie?: string; authorization?: string } = {}) {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.authorization) headers.set("authorization", init.authorization);
  return new NextRequest(`https://t.example.dev${path}`, { headers });
}

describe("proxy", () => {
  it("always allows /login", async () => {
    const response = await proxy(requestFor("/login"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an unauthenticated page request to /login", async () => {
    const response = await proxy(requestFor("/"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://t.example.dev/login");
  });

  it("returns 401 JSON for an unauthenticated API request", async () => {
    const response = await proxy(requestFor("/api/emails"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Non authentifié" });
  });

  it("lets a page request through with a valid session cookie", async () => {
    const token = await createSessionToken();
    const response = await proxy(
      requestFor("/", { cookie: `${SESSION_COOKIE_NAME}=${token}` }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets an API request through with a valid Bearer token", async () => {
    const response = await proxy(
      requestFor("/api/emails", { authorization: "Bearer test-api-token" }),
    );
    expect(response.status).toBe(200);
  });

  it("rejects an API request with an invalid Bearer token", async () => {
    const response = await proxy(
      requestFor("/api/emails", { authorization: "Bearer nope" }),
    );
    expect(response.status).toBe(401);
  });
});
