import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isRequestAuthenticated = vi.fn();
vi.mock("@/lib/auth", () => ({
  isRequestAuthenticated: (...args: unknown[]) =>
    isRequestAuthenticated(...args),
}));

const createEmail = vi.fn();
const listEmails = vi.fn();
vi.mock("@/lib/services/emails", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/emails")>(
    "@/lib/services/emails",
  );
  return {
    ...actual,
    createEmail: (...args: unknown[]) => createEmail(...args),
    listEmails: (...args: unknown[]) => listEmails(...args),
  };
});

const { GET, POST } = await import("@/app/api/emails/route");

function makeRequest(
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
) {
  return new NextRequest(url, init);
}

describe("GET /api/emails", () => {
  beforeEach(() => {
    isRequestAuthenticated.mockReset();
    listEmails.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    isRequestAuthenticated.mockResolvedValue(false);
    const response = await GET(makeRequest("https://t.example.dev/api/emails"));
    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid status filter", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    const response = await GET(
      makeRequest("https://t.example.dev/api/emails?status=bogus"),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("lists emails when authenticated", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    listEmails.mockResolvedValue([{ id: "e1" }]);
    const response = await GET(
      makeRequest("https://t.example.dev/api/emails?status=opened"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ emails: [{ id: "e1" }] });
    expect(listEmails).toHaveBeenCalledWith(
      expect.objectContaining({ status: "opened" }),
    );
  });
});

describe("POST /api/emails", () => {
  beforeEach(() => {
    isRequestAuthenticated.mockReset();
    createEmail.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    isRequestAuthenticated.mockResolvedValue(false);
    const response = await POST(
      makeRequest("https://t.example.dev/api/emails", { method: "POST" }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when the label is missing", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    const response = await POST(
      makeRequest("https://t.example.dev/api/emails", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for an invalid JSON body", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    const response = await POST(
      makeRequest("https://t.example.dev/api/emails", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("creates the email and returns 201 with id, pixelUrl and imgTag", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    createEmail.mockResolvedValue({
      id: "abc123",
      pixelUrl: "https://t.example.dev/p/abc123.gif",
      imgTag: '<img src="https://t.example.dev/p/abc123.gif">',
    });
    const response = await POST(
      makeRequest("https://t.example.dev/api/emails", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "Candidature X" }),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe("abc123");
    expect(body.pixelUrl).toContain("/p/abc123.gif");
    expect(body.imgTag).toContain(body.pixelUrl);
  });
});
