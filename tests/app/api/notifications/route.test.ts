import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isRequestAuthenticated = vi.fn();
vi.mock("@/lib/auth", () => ({
  isRequestAuthenticated: (...args: unknown[]) =>
    isRequestAuthenticated(...args),
}));

const listUnreadNotifications = vi.fn();
vi.mock("@/lib/services/notifications", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/notifications")
  >("@/lib/services/notifications");
  return {
    ...actual,
    listUnreadNotifications: (...args: unknown[]) =>
      listUnreadNotifications(...args),
  };
});

const { GET } = await import("@/app/api/notifications/route");

beforeEach(() => {
  isRequestAuthenticated.mockReset();
  listUnreadNotifications.mockReset();
});

describe("GET /api/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    isRequestAuthenticated.mockResolvedValue(false);
    const response = await GET(
      new NextRequest("https://t.example.dev/api/notifications"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid since", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    const response = await GET(
      new NextRequest("https://t.example.dev/api/notifications?since=nope"),
    );
    expect(response.status).toBe(400);
  });

  it("returns the unread count and notifications", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    listUnreadNotifications.mockResolvedValue({ count: 1, notifications: [] });
    const response = await GET(
      new NextRequest("https://t.example.dev/api/notifications"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1, notifications: [] });
  });

  it("passes the since parameter through as a Date", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    listUnreadNotifications.mockResolvedValue({ count: 0, notifications: [] });
    await GET(
      new NextRequest(
        "https://t.example.dev/api/notifications?since=2026-01-01T00:00:00.000Z",
      ),
    );
    expect(listUnreadNotifications).toHaveBeenCalledWith(
      new Date("2026-01-01T00:00:00.000Z"),
    );
  });
});
