import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recordOpen = vi.fn();

vi.mock("@/lib/tracking", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tracking")>(
    "@/lib/tracking",
  );
  return {
    ...actual,
    recordOpen: (...args: Parameters<typeof actual.recordOpen>) =>
      recordOpen(...args),
  };
});

const { GET } = await import("@/app/p/[id]/route");

function makeRequest(pathId: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://t.example.dev/p/${pathId}`, { headers });
}

async function expectValidPixelResponse(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("image/gif");
  expect(response.headers.get("Content-Length")).toBe("43");
  expect(response.headers.get("Cache-Control")).toBe(
    "no-store, no-cache, must-revalidate, private, max-age=0",
  );
  expect(response.headers.get("Pragma")).toBe("no-cache");
  expect(response.headers.get("Expires")).toBe("0");
  expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  expect(response.headers.get("Set-Cookie")).toBeNull();
  expect(response.headers.get("Location")).toBeNull();

  const body = Buffer.from(await response.arrayBuffer());
  expect(body.byteLength).toBe(43);
}

describe("GET /p/[id]", () => {
  beforeEach(() => {
    recordOpen.mockReset();
    recordOpen.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the pixel for a valid, existing id", async () => {
    const response = await GET(makeRequest("abc123.gif"), {
      params: Promise.resolve({ id: "abc123.gif" }),
    });
    await expectValidPixelResponse(response);
    expect(recordOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: "abc123" }),
    );
  });

  it("returns the pixel for an unknown id", async () => {
    const response = await GET(makeRequest("does-not-exist.gif"), {
      params: Promise.resolve({ id: "does-not-exist.gif" }),
    });
    await expectValidPixelResponse(response);
  });

  it("returns the pixel for a malformed id", async () => {
    const response = await GET(makeRequest("!!!.gif"), {
      params: Promise.resolve({ id: "!!!" }),
    });
    await expectValidPixelResponse(response);
  });

  it("returns the pixel with or without the .gif extension", async () => {
    const withExt = await GET(makeRequest("abc123.gif"), {
      params: Promise.resolve({ id: "abc123.gif" }),
    });
    const withoutExt = await GET(makeRequest("abc123"), {
      params: Promise.resolve({ id: "abc123" }),
    });
    await expectValidPixelResponse(withExt);
    await expectValidPixelResponse(withoutExt);
  });

  it("returns the pixel even when tracking fails (database unavailable)", async () => {
    recordOpen.mockRejectedValue(new Error("database unreachable"));
    const response = await GET(makeRequest("abc123.gif"), {
      params: Promise.resolve({ id: "abc123.gif" }),
    });
    await expectValidPixelResponse(response);
  });

  it("returns the pixel even when reading params throws", async () => {
    const response = await GET(makeRequest("abc123.gif"), {
      params: Promise.reject(new Error("boom")),
    });
    await expectValidPixelResponse(response);
  });

  it("never sets a cookie regardless of the request headers", async () => {
    const response = await GET(
      makeRequest("abc123.gif", { cookie: "session=abc" }),
      { params: Promise.resolve({ id: "abc123.gif" }) },
    );
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });
});
