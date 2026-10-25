import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isRequestAuthenticated = vi.fn();
vi.mock("@/lib/auth", () => ({
  isRequestAuthenticated: (...args: unknown[]) =>
    isRequestAuthenticated(...args),
}));

const listDueFollowUps = vi.fn();
const markFollowUpsNotified = vi.fn();
vi.mock("@/lib/services/emails", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/emails")
  >("@/lib/services/emails");
  return {
    ...actual,
    listDueFollowUps: (...args: unknown[]) => listDueFollowUps(...args),
    markFollowUpsNotified: (...args: unknown[]) =>
      markFollowUpsNotified(...args),
  };
});

const { GET } = await import("@/app/api/follow-ups/route");
const { POST } = await import("@/app/api/follow-ups/read/route");

beforeEach(() => {
  isRequestAuthenticated.mockReset();
  listDueFollowUps.mockReset();
  markFollowUpsNotified.mockReset();
});

function postRead(body: string) {
  return POST(
    new NextRequest("https://t.example.dev/api/follow-ups/read", {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("GET /api/follow-ups", () => {
  it("returns 401 when not authenticated", async () => {
    isRequestAuthenticated.mockResolvedValue(false);
    const response = await GET(
      new NextRequest("https://t.example.dev/api/follow-ups"),
    );
    expect(response.status).toBe(401);
  });

  it("returns the due follow-ups", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    listDueFollowUps.mockResolvedValue([{ id: "a", label: "A" }]);
    const response = await GET(
      new NextRequest("https://t.example.dev/api/follow-ups"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      followUps: [{ id: "a", label: "A" }],
    });
  });
});

describe("POST /api/follow-ups/read", () => {
  it("returns 401 when not authenticated", async () => {
    isRequestAuthenticated.mockResolvedValue(false);
    expect((await postRead('{"ids":["a"]}')).status).toBe(401);
  });

  it("returns 400 for invalid JSON or an empty id list", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    expect((await postRead("{nope")).status).toBe(400);
    expect((await postRead('{"ids":[]}')).status).toBe(400);
  });

  it("marks the given follow-ups as notified", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    markFollowUpsNotified.mockResolvedValue(1);
    const response = await postRead('{"ids":["a"]}');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updated: 1 });
    expect(markFollowUpsNotified).toHaveBeenCalledWith(["a"]);
  });
});
