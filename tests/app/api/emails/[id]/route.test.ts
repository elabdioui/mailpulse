import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isRequestAuthenticated = vi.fn();
vi.mock("@/lib/auth", () => ({
  isRequestAuthenticated: (...args: unknown[]) =>
    isRequestAuthenticated(...args),
}));

const getEmailById = vi.fn();
const updateEmail = vi.fn();
const deleteEmail = vi.fn();
vi.mock("@/lib/services/emails", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/emails")>(
    "@/lib/services/emails",
  );
  return {
    ...actual,
    getEmailById: (...args: unknown[]) => getEmailById(...args),
    updateEmail: (...args: unknown[]) => updateEmail(...args),
    deleteEmail: (...args: unknown[]) => deleteEmail(...args),
  };
});

const { GET, PATCH, DELETE } = await import("@/app/api/emails/[id]/route");

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  isRequestAuthenticated.mockReset();
  getEmailById.mockReset();
  updateEmail.mockReset();
  deleteEmail.mockReset();
});

describe("GET /api/emails/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    isRequestAuthenticated.mockResolvedValue(false);
    const response = await GET(
      new NextRequest("https://t.example.dev/api/emails/e1"),
      ctx("e1"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 for an unknown id", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    getEmailById.mockResolvedValue(null);
    const response = await GET(
      new NextRequest("https://t.example.dev/api/emails/missing"),
      ctx("missing"),
    );
    expect(response.status).toBe(404);
  });

  it("returns the email detail", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    getEmailById.mockResolvedValue({ id: "e1", label: "Test" });
    const response = await GET(
      new NextRequest("https://t.example.dev/api/emails/e1"),
      ctx("e1"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: { id: "e1", label: "Test" } });
  });
});

describe("PATCH /api/emails/[id]", () => {
  it("returns 400 for an empty patch", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    const response = await PATCH(
      new NextRequest("https://t.example.dev/api/emails/e1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      ctx("e1"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 when the email does not exist", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    updateEmail.mockResolvedValue(null);
    const response = await PATCH(
      new NextRequest("https://t.example.dev/api/emails/missing", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: true }),
      }),
      ctx("missing"),
    );
    expect(response.status).toBe(404);
  });

  it("updates the email", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    updateEmail.mockResolvedValue({ id: "e1", archived: true });
    const response = await PATCH(
      new NextRequest("https://t.example.dev/api/emails/e1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: true }),
      }),
      ctx("e1"),
    );
    expect(response.status).toBe(200);
    expect(updateEmail).toHaveBeenCalledWith("e1", { archived: true });
  });
});

describe("DELETE /api/emails/[id]", () => {
  it("returns 404 when the email does not exist", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    deleteEmail.mockResolvedValue(false);
    const response = await DELETE(
      new NextRequest("https://t.example.dev/api/emails/missing", {
        method: "DELETE",
      }),
      ctx("missing"),
    );
    expect(response.status).toBe(404);
  });

  it("returns 204 on success", async () => {
    isRequestAuthenticated.mockResolvedValue(true);
    deleteEmail.mockResolvedValue(true);
    const response = await DELETE(
      new NextRequest("https://t.example.dev/api/emails/e1", {
        method: "DELETE",
      }),
      ctx("e1"),
    );
    expect(response.status).toBe(204);
  });
});
