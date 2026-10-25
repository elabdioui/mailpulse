"use client";

/**
 * Copies the pixel <img> tag as text/html (with a text/plain fallback) so
 * pasting into Gmail's rich-text composer inserts the actual image instead
 * of the raw markup.
 */
export async function copyImgTagForGmail(imgTag: string): Promise<void> {
  if (typeof ClipboardItem !== "undefined") {
    const item = new ClipboardItem({
      "text/html": new Blob([imgTag], { type: "text/html" }),
      "text/plain": new Blob([" "], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
    return;
  }
  await navigator.clipboard.writeText(imgTag);
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
