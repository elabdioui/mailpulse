import { NextResponse } from "next/server";

import { env } from "@/lib/env";

/**
 * Minimal valid GIF89a: 1x1 transparent pixel, 43 bytes exactly.
 * Byte-for-byte layout: header, logical screen descriptor, global color
 * table (2 colors), graphic control extension (transparency), image
 * descriptor, LZW image data, trailer.
 */
export const TRANSPARENT_GIF_BUFFER = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // "GIF89a"
  0x01, 0x00, // width = 1
  0x01, 0x00, // height = 1
  0x80, // global color table present, 2 colors
  0x00, // background color index
  0x00, // pixel aspect ratio
  0x00, 0x00, 0x00, // color 0: black
  0xff, 0xff, 0xff, // color 1: white
  0x21, 0xf9, // graphic control extension
  0x04, // block size
  0x01, // packed fields: transparent color flag set
  0x00, 0x00, // delay time
  0x00, // transparent color index (color 0)
  0x00, // block terminator
  0x2c, // image separator
  0x00, 0x00, // left position
  0x00, 0x00, // top position
  0x01, 0x00, // width = 1
  0x01, 0x00, // height = 1
  0x00, // packed fields: no local color table
  0x02, // LZW minimum code size
  0x02, // data sub-block size
  0x44, 0x01, // compressed image data
  0x00, // block terminator
  0x3b, // trailer
]);

export const PIXEL_RESPONSE_HEADERS: Record<string, string> = {
  "Content-Type": "image/gif",
  "Content-Length": String(TRANSPARENT_GIF_BUFFER.byteLength),
  "Cache-Control": "no-store, no-cache, must-revalidate, private, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "X-Robots-Tag": "noindex",
};

export function buildPixelResponse(): NextResponse {
  return new NextResponse(TRANSPARENT_GIF_BUFFER, {
    status: 200,
    headers: PIXEL_RESPONSE_HEADERS,
  });
}

export function buildPixelUrl(id: string): string {
  return `${env.PUBLIC_BASE_URL}/p/${id}.gif`;
}

export function buildImgTag(pixelUrl: string): string {
  return `<img src="${pixelUrl}" width="1" height="1" alt="" style="border:0;width:1px;height:1px;">`;
}
