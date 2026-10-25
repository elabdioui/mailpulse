import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isRequestAuthenticated = vi.fn();
vi.mock("@/lib/auth", () => ({
  isRequestAuthenticated: (...args: unknown[]) =>
    isRequestAuthenticated(...args),
}));

const getDeliverabilityReport = vi.fn();
vi.mock("@/lib/deliverability", () => ({
  getDeliverabilityReport: (...args: unknown[]) =>
    getDeliverabilityReport(...args),
}));

const { GET } = await import("@/app/api/health/deliverability/route");

beforeEach(() => {
  isRequestAuthenticated.mockReset();
  getDeliverabilityReport.mockReset();
});

describe("GET /api/health/deliverability", () => {
  it("returns 401 when not authenticated", async () => {
    isRequestAuthenticated.mockResolvedValue(false);
    const response = await GET(
      new NextRequest("https://t.example.dev/api/health/deliverability"),
    );
    expect(response.status).toBe(401);
  });

  it("returns the deliverability report when authenticated", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    getDeliverabilityReport.mockResolvedValue({
      checks: [{ id: "https", label: "HTTPS", status: "pass", detail: "ok" }],
      checkedAt: "2026-01-01T00:00:00.000Z",
    });
    const response = await GET(
      new NextRequest("https://t.example.dev/api/health/deliverability"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.checks).toHaveLength(1);
  });
});
