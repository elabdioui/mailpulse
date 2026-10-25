import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isRequestAuthenticated = vi.fn();
vi.mock("@/lib/auth", () => ({
  isRequestAuthenticated: (...args: unknown[]) =>
    isRequestAuthenticated(...args),
}));

const markNotificationsRead = vi.fn();
vi.mock("@/lib/services/notifications", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/notifications")
  >("@/lib/services/notifications");
  return {
    ...actual,
    markNotificationsRead: (...args: unknown[]) =>
      markNotificationsRead(...args),
  };
});

const { POST } = await import("@/app/api/notifications/read/route");

beforeEach(() => {
  isRequestAuthenticated.mockReset();
  markNotificationsRead.mockReset();
});

describe("POST /api/notifications/read", () => {
  it("returns 401 when not authenticated", async () => {
    isRequestAuthenticated.mockResolvedValue(false);
    const response = await POST(
      new NextRequest("https://t.example.dev/api/notifications/read", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("marks all as read with no body", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    markNotificationsRead.mockResolvedValue(4);
    const response = await POST(
      new NextRequest("https://t.example.dev/api/notifications/read", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(200);
    expect(markNotificationsRead).toHaveBeenCalledWith(undefined);
    expect(await response.json()).toEqual({ updated: 4 });
  });

  it("marks only the given ids", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    markNotificationsRead.mockResolvedValue(2);
    const response = await POST(
      new NextRequest("https://t.example.dev/api/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [1, 2] }),
      }),
    );
    expect(response.status).toBe(200);
    expect(markNotificationsRead).toHaveBeenCalledWith([1, 2]);
  });

  it("returns 400 for invalid ids", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    const response = await POST(
      new NextRequest("https://t.example.dev/api/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [-1] }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
