import { describe, expect, it, vi } from "vitest";

import {
  checkHttps,
  checkSharedHost,
  getDeliverabilityReport,
} from "@/lib/deliverability";
import { HEALTHCHECK_ID } from "@/lib/tracking";

describe("checkHttps", () => {
  it("passes for an https URL", () => {
    const check = checkHttps("https://t.example.dev");
    expect(check.status).toBe("pass");
  });

  it("fails for a non-https URL", () => {
    const check = checkHttps("http://t.example.dev");
    expect(check.status).toBe("fail");
    expect(check.fix).toBeTruthy();
  });
});

describe("checkSharedHost", () => {
  it("fails for a shared free host like *.vercel.app", () => {
    const check = checkSharedHost("https://my-app.vercel.app");
    expect(check.status).toBe("fail");
  });

  it("passes for a personal domain", () => {
    const check = checkSharedHost("https://t.mondomaine.dev");
    expect(check.status).toBe("pass");
  });
});

function jsonResponse(
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(null, { status, headers });
}

describe("getDeliverabilityReport", () => {
  it("passes the pixel checks for a correct, fast, non-redirecting response", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toBe(`https://t.example.dev/p/${HEALTHCHECK_ID}.gif`);
      return jsonResponse(200, {
        "content-type": "image/gif",
        "content-length": "43",
      });
    });

    const report = await getDeliverabilityReport({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://t.example.dev",
    });

    const pixelCheck = report.checks.find((c) => c.id === "pixel-response");
    const redirectCheck = report.checks.find((c) => c.id === "no-redirect");
    expect(pixelCheck?.status).toBe("pass");
    expect(redirectCheck?.status).toBe("pass");
  });

  it("fails the pixel check when headers are wrong", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { "content-type": "text/plain", "content-length": "3" }),
    );

    const report = await getDeliverabilityReport({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://t.example.dev",
    });

    const pixelCheck = report.checks.find((c) => c.id === "pixel-response");
    expect(pixelCheck?.status).toBe("fail");
    expect(pixelCheck?.detail).toContain("text/plain");
  });

  it("fails the pixel check when a Set-Cookie header is present", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        "content-type": "image/gif",
        "content-length": "43",
        "set-cookie": "session=abc",
      }),
    );

    const report = await getDeliverabilityReport({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://t.example.dev",
    });

    const pixelCheck = report.checks.find((c) => c.id === "pixel-response");
    expect(pixelCheck?.status).toBe("fail");
    expect(pixelCheck?.detail).toContain("Set-Cookie");
  });

  it("fails the no-redirect check on a 3xx response", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(302, { location: "https://www.t.example.dev/p/healthcheck.gif" }),
    );

    const report = await getDeliverabilityReport({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://t.example.dev",
    });

    const redirectCheck = report.checks.find((c) => c.id === "no-redirect");
    expect(redirectCheck?.status).toBe("fail");
  });

  it("fails both pixel checks when the fetch throws (unreachable host)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("fetch failed");
    });

    const report = await getDeliverabilityReport({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://t.example.dev",
    });

    const pixelCheck = report.checks.find((c) => c.id === "pixel-response");
    const redirectCheck = report.checks.find((c) => c.id === "no-redirect");
    expect(pixelCheck?.status).toBe("fail");
    expect(redirectCheck?.status).toBe("fail");
  });

  it("includes all four checks", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { "content-type": "image/gif", "content-length": "43" }),
    );

    const report = await getDeliverabilityReport({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://t.example.dev",
    });

    expect(report.checks.map((c) => c.id).sort()).toEqual(
      ["https", "no-redirect", "pixel-response", "shared-host"].sort(),
    );
  });
});
