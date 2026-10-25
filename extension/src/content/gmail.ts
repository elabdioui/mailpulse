import * as S from "./selectors";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export interface ComposeInfo {
  root: HTMLElement;
  body: HTMLElement;
  sender: string | null;
  recipients: string[];
  subject: string;
}

/**
 * The compose root is the closest ancestor of the send button that also
 * holds the message body: it works for the floating compose window, the
 * full-screen one and inline replies alike.
 */
export function findComposeRoot(sendButton: Element): HTMLElement | null {
  let node: HTMLElement | null = sendButton.parentElement;
  while (node && node !== document.body) {
    if (node.querySelector(S.BODY)) return node;
    node = node.parentElement;
  }
  return null;
}

function extractEmail(value: string | null | undefined): string | null {
  return value?.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
}

export function detectAccount(): string | null {
  return (
    extractEmail(document.title) ??
    extractEmail(document.querySelector(S.ACCOUNT_BUTTON)?.getAttribute("aria-label"))
  );
}

function detectSender(root: HTMLElement): string | null {
  const alias = root.querySelector<HTMLInputElement>(S.FROM_INPUT)?.value;
  return extractEmail(alias) ?? detectAccount();
}

function detectRecipients(root: HTMLElement, body: HTMLElement, sender: string | null): string[] {
  const found = new Set<string>();

  for (const chip of root.querySelectorAll(S.RECIPIENT_CHIPS)) {
    // Quoted replies inside the body contain hovercards too: skip them.
    if (body.contains(chip)) continue;
    const email =
      extractEmail(chip.getAttribute("email")) ??
      extractEmail(chip.getAttribute("data-hovercard-id"));
    if (email) found.add(email);
  }

  for (const input of root.querySelectorAll<HTMLInputElement>(S.RECIPIENT_INPUTS)) {
    for (const part of input.value.split(",")) {
      const email = extractEmail(part);
      if (email) found.add(email);
    }
  }

  if (sender) found.delete(sender);
  return [...found];
}

function detectSubject(root: HTMLElement): string {
  const subject = root.querySelector<HTMLInputElement>(S.SUBJECT)?.value.trim();
  if (subject) return subject;
  return document.querySelector(S.THREAD_SUBJECT)?.textContent?.trim() ?? "";
}

export function readCompose(sendButton: Element): ComposeInfo | null {
  const root = findComposeRoot(sendButton);
  const body = root?.querySelector<HTMLElement>(S.BODY);
  if (!root || !body) return null;
  const sender = detectSender(root);
  return {
    root,
    body,
    sender,
    recipients: detectRecipients(root, body, sender),
    subject: detectSubject(root),
  };
}

/** Appends the tracking pixel at the very end of the message body. */
export function insertPixel(body: HTMLElement, imgTag: string): void {
  body.insertAdjacentHTML("beforeend", imgTag);
  // Lets Gmail's editor register the change before the message is sent.
  body.dispatchEvent(new InputEvent("input", { bubbles: true }));
}
