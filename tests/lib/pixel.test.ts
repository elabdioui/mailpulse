import { describe, expect, it } from "vitest";

import {
  PIXEL_RESPONSE_HEADERS,
  TRANSPARENT_GIF_BUFFER,
  buildImgTag,
  buildPixelResponse,
  buildPixelUrl,
} from "@/lib/pixel";

describe("TRANSPARENT_GIF_BUFFER", () => {
  it("is exactly 43 bytes", () => {
    expect(TRANSPARENT_GIF_BUFFER.byteLength).toBe(43);
  });

  it("starts with the GIF89a header", () => {
    expect(TRANSPARENT_GIF_BUFFER.subarray(0, 6).toString("ascii")).toBe(
      "GIF89a",
    );
  });

  it("ends with the GIF trailer byte", () => {
    expect(TRANSPARENT_GIF_BUFFER[TRANSPARENT_GIF_BUFFER.length - 1]).toBe(
      0x3b,
    );
  });
});

describe("buildPixelResponse", () => {
  it("returns status 200 with the exact required headers", async () => {
    const response = buildPixelResponse();
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

    const body = Buffer.from(await response.arrayBuffer());
    expect(body.byteLength).toBe(43);
    expect(body.equals(TRANSPARENT_GIF_BUFFER)).toBe(true);
  });

  it("never sets a cookie", () => {
    expect(
      Object.keys(PIXEL_RESPONSE_HEADERS).some((h) =>
        h.toLowerCase().includes("cookie"),
      ),
    ).toBe(false);
  });
});

describe("buildPixelUrl", () => {
  it("builds a URL with no query parameters, from PUBLIC_BASE_URL", () => {
    const url = buildPixelUrl("abc123");
    expect(url).toBe("https://t.example.dev/p/abc123.gif");
    expect(url.includes("?")).toBe(false);
  });
});

describe("buildImgTag (spec section 8.2)", () => {
  it("matches the exact required markup", () => {
    const pixelUrl = "https://t.example.dev/p/abc123.gif";
    expect(buildImgTag(pixelUrl)).toBe(
      '<img src="https://t.example.dev/p/abc123.gif" width="1" height="1" alt="" style="border:0;width:1px;height:1px;">',
    );
  });

  it("never uses a hiding technique or forbidden tracking-related attribute", () => {
    const tag = buildImgTag(buildPixelUrl("abc123"));
    for (const forbidden of [
      "display:none",
      "visibility:hidden",
      "opacity:0",
      "max-height:0",
      "track",
      "pixel",
      "spy",
      "beacon",
      "open",
    ]) {
      expect(tag.toLowerCase()).not.toContain(forbidden);
    }
  });
});
