import { send, type RecentEmail } from "../shared/messages";
import { getSettings, isConfigured, saveSettings } from "../shared/settings";

const enabled = document.querySelector<HTMLInputElement>("#enabled")!;
const list = document.querySelector<HTMLUListElement>("#recent")!;
const dashboard = document.querySelector<HTMLAnchorElement>("#dashboard")!;
const refresh = document.querySelector<HTMLButtonElement>("#refresh")!;

function relative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function message(text: string, tone: "muted" | "error" = "muted"): void {
  list.replaceChildren();
  const li = document.createElement("li");
  li.className = tone;
  li.textContent = text;
  list.append(li);
}

function render(baseUrl: string, emails: RecentEmail[]): void {
  if (emails.length === 0) {
    message("Aucun mail suivi pour l'instant. Envoie un mail depuis Gmail !");
    return;
  }
  list.replaceChildren(
    ...emails.map((email) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = `${baseUrl}/emails/${email.id}`;
      link.target = "_blank";

      const label = document.createElement("span");
      label.className = "label";
      label.textContent = email.label;

      const sub = document.createElement("span");
      sub.className = "sub muted";
      sub.textContent = `${email.recipient ?? "—"} · ${relative(email.createdAt)}`;

      const badge = document.createElement("span");
      badge.className = `badge ${email.opens > 0 ? "ok" : "muted"}`;
      badge.textContent = email.opens > 0 ? `Ouvert ${email.opens}×` : "En attente";

      link.append(label, badge, sub);
      li.append(link);
      return li;
    }),
  );
}

async function load(): Promise<void> {
  const settings = await getSettings();
  enabled.checked = settings.enabled;
  if (!isConfigured(settings)) {
    message("Configure l'URL du tableau de bord et le token dans les options.", "error");
    dashboard.href = chrome.runtime.getURL("options.html");
    dashboard.textContent = "Configurer";
    return;
  }
  dashboard.href = settings.baseUrl;
  const result = await send<{ ok: true; emails: RecentEmail[] }>({ type: "recent-emails" });
  if (result.ok) render(settings.baseUrl, result.emails);
  else message(result.error, "error");
}

enabled.addEventListener("change", async () => {
  await saveSettings({ enabled: enabled.checked });
  if (!enabled.checked) await chrome.action.setBadgeText({ text: "" });
});

refresh.addEventListener("click", async () => {
  refresh.disabled = true;
  await send({ type: "poll-now" });
  await load();
  refresh.disabled = false;
});

void load();
