import { send, type TrackEmailResponse } from "../shared/messages";
import { getSettings, isConfigured, type Settings } from "../shared/settings";
import { insertPixel, readCompose } from "./gmail";
import { BODY, SEND_BUTTON } from "./selectors";
import { askBeforeSend, toast } from "./send-panel";

let settings: Settings | null = null;
void getSettings().then((loaded) => {
  settings = loaded;
  hideOwnPixels(document);
});
chrome.storage.onChanged.addListener(() => {
  void getSettings().then((loaded) => (settings = loaded));
});

// --- Send interception -------------------------------------------------
// Gmail sends on a mousedown → mouseup → click sequence (or Ctrl/⌘+Entrée).
// We swallow the whole sequence in the capture phase, ask our question,
// then replay it with `bypass` set so Gmail's own handlers run normally.

const bypass = new WeakSet<Element>();
const busy = new WeakSet<Element>();

function sendButtonFrom(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(SEND_BUTTON) : null;
}

function replaySend(button: HTMLElement): void {
  bypass.add(button);
  for (const type of ["mousedown", "mouseup", "click"]) {
    button.dispatchEvent(
      new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }),
    );
  }
  setTimeout(() => bypass.delete(button), 0);
}

async function handleSend(button: HTMLElement): Promise<void> {
  const current = settings ?? (await getSettings());
  const compose = readCompose(button);

  if (!current.enabled || !compose || compose.body.querySelector(`img[src^="${current.baseUrl}/p/"]`)) {
    replaySend(button);
    return;
  }
  if (!isConfigured(current)) {
    toast("MailPulse n'est pas configuré : mail envoyé sans suivi.", "error");
    replaySend(button);
    return;
  }

  const choice = await askBeforeSend({
    sender: compose.sender,
    recipients: compose.recipients,
    subject: compose.subject,
    defaultFollowUp: current.defaultFollowUp,
  });

  if (choice.action === "cancel") return;
  if (choice.action === "skip") {
    replaySend(button);
    return;
  }

  const result = await send<TrackEmailResponse>({
    type: "track-email",
    sender: compose.sender,
    recipients: compose.recipients,
    subject: compose.subject,
    followUpDays: choice.followUpDays,
  });

  if (result.ok) {
    insertPixel(compose.body, result.imgTag);
    replaySend(button);
    toast(choice.followUpDays ? `Mail suivi · relance dans ${choice.followUpDays} j si pas ouvert` : "Mail suivi");
  } else {
    // Never hold a mail hostage: it still goes out, just untracked.
    replaySend(button);
    toast(`Suivi impossible (${result.error}) : mail envoyé sans suivi.`, "error");
  }
}

function start(button: HTMLElement): void {
  if (busy.has(button)) return;
  busy.add(button);
  void handleSend(button).finally(() => busy.delete(button));
}

for (const type of ["mousedown", "mouseup", "click"] as const) {
  window.addEventListener(
    type,
    (event) => {
      const button = sendButtonFrom(event.target);
      if (!button || bypass.has(button) || !event.isTrusted) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (type === "mousedown") start(button);
    },
    true,
  );
}

window.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey) || !event.isTrusted) return;
    const active = document.activeElement;
    if (!active) return;
    // Walk up to the compose window and find its send button.
    let node: Element | null = active;
    while (node && node !== document.body) {
      const button = node.querySelector<HTMLElement>(SEND_BUTTON);
      if (button && node.querySelector(BODY)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        start(button);
        return;
      }
      node = node.parentElement;
    }
  },
  true,
);

// --- Self-exclusion ----------------------------------------------------
// When you reread a tracked mail in "Envoyés", Gmail loads the pixel through
// its image proxy (…googleusercontent.com/…#https://ton-dashboard/p/<id>.gif)
// and it would count as an open. Blank those images out (best effort; the
// grace period on the server covers the first minutes anyway).

const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function isOwnPixel(img: HTMLImageElement): boolean {
  if (!settings?.baseUrl || img.closest(BODY)) return false;
  const src = img.getAttribute("src") ?? "";
  const pixelPrefix = `${settings.baseUrl}/p/`;
  return src.startsWith(pixelPrefix) || src.includes(`#${pixelPrefix}`);
}

function hideOwnPixels(root: ParentNode): void {
  for (const img of root.querySelectorAll("img")) {
    if (isOwnPixel(img)) img.src = BLANK_GIF;
  }
}

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "attributes" && mutation.target instanceof HTMLImageElement) {
      if (isOwnPixel(mutation.target)) mutation.target.src = BLANK_GIF;
      continue;
    }
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLImageElement) {
        if (isOwnPixel(node)) node.src = BLANK_GIF;
      } else if (node instanceof Element) {
        hideOwnPixels(node);
      }
    }
  }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["src"],
});
