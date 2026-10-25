import { send } from "../shared/messages";
import {
  getSettings,
  normalizeBaseUrl,
  saveSettings,
  type FollowUpChoice,
} from "../shared/settings";

const form = document.querySelector<HTMLFormElement>("#form")!;
const baseUrl = document.querySelector<HTMLInputElement>("#baseUrl")!;
const token = document.querySelector<HTMLInputElement>("#token")!;
const defaultFollowUp = document.querySelector<HTMLSelectElement>("#defaultFollowUp")!;
const enabled = document.querySelector<HTMLInputElement>("#enabled")!;
const status = document.querySelector<HTMLSpanElement>("#status")!;

function show(text: string, tone: "ok" | "error" | "muted"): void {
  status.className = tone;
  status.textContent = text;
}

void getSettings().then((settings) => {
  baseUrl.value = settings.baseUrl;
  token.value = settings.token;
  defaultFollowUp.value = String(settings.defaultFollowUp);
  enabled.checked = settings.enabled;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const origin = normalizeBaseUrl(baseUrl.value);
  if (!origin) {
    show("URL invalide : elle doit commencer par https://", "error");
    return;
  }

  // The service worker can only call the dashboard once Chrome granted it
  // access to that origin; this must run inside the click (user gesture).
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) {
    show("Accès au tableau de bord refusé : l'extension ne pourra pas l'appeler.", "error");
    return;
  }

  baseUrl.value = origin;
  await saveSettings({
    baseUrl: origin,
    token: token.value.trim(),
    defaultFollowUp: Number(defaultFollowUp.value) as FollowUpChoice,
    enabled: enabled.checked,
  });

  show("Test de la connexion…", "muted");
  const result = await send<{ ok: true }>({ type: "test-connection" });
  if (result.ok) {
    show("Connecté ✓", "ok");
    await send({ type: "poll-now" });
  } else {
    show(result.error, "error");
  }
});
