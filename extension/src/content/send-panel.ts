import type { FollowUpChoice } from "../shared/settings";

export type PanelResult =
  | { action: "track"; followUpDays: FollowUpChoice }
  | { action: "skip" }
  | { action: "cancel" };

interface PanelOptions {
  sender: string | null;
  recipients: string[];
  subject: string;
  defaultFollowUp: FollowUpChoice;
}

const CHOICES: Array<{ value: FollowUpChoice; label: string }> = [
  { value: 0, label: "Non" },
  { value: 1, label: "1 j" },
  { value: 3, label: "3 j" },
  { value: 7, label: "7 j" },
];

const STYLE = `
  :host { all: initial; }
  .panel {
    position: fixed; right: 24px; bottom: 24px; z-index: 2147483647;
    width: 340px; box-sizing: border-box; padding: 16px;
    font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #0a0a0a; background: #fff; border: 1px solid #e5e5e5;
    border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.18);
  }
  @media (prefers-color-scheme: dark) {
    .panel { color: #fafafa; background: #171717; border-color: #2e2e2e; }
    .muted { color: #a3a3a3 !important; }
    .choice { border-color: #3a3a3a !important; color: #fafafa !important; }
    .choice[aria-checked="true"] { background: #fafafa !important; color: #0a0a0a !important; }
    .secondary { color: #fafafa !important; border-color: #3a3a3a !important; }
  }
  .title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
  .meta { margin: 10px 0 12px; display: grid; gap: 2px; }
  .row { display: flex; gap: 6px; min-width: 0; }
  .row span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .muted { color: #737373; flex: none; }
  .question { font-weight: 500; margin-bottom: 6px; }
  .choices { display: flex; gap: 6px; margin-bottom: 14px; }
  .choice {
    flex: 1; padding: 6px 0; border: 1px solid #e5e5e5; border-radius: 8px;
    background: transparent; color: #0a0a0a; font: inherit; cursor: pointer;
  }
  .choice[aria-checked="true"] { background: #0a0a0a; color: #fff; border-color: transparent; }
  .actions { display: flex; gap: 8px; }
  button.primary, button.secondary {
    flex: 1; padding: 8px 10px; border-radius: 8px; font: inherit; font-weight: 500; cursor: pointer;
  }
  .primary { background: #16a34a; color: #fff; border: none; }
  .secondary { background: transparent; color: #0a0a0a; border: 1px solid #e5e5e5; }
  .hint { margin-top: 8px; font-size: 11px; }
`;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Shows the send-time panel and resolves with what the user picked. */
export function askBeforeSend(options: PanelOptions): Promise<PanelResult> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "closed" });
    let followUp = options.defaultFollowUp;

    const recipients = options.recipients.length
      ? options.recipients.join(", ")
      : "non détectés";

    shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="panel" role="dialog" aria-label="Suivi MailPulse">
        <div class="title"><span class="dot"></span>Suivre ce mail avec MailPulse</div>
        <div class="meta">
          <div class="row"><span class="muted">De</span><span>${escapeHtml(options.sender ?? "non détecté")}</span></div>
          <div class="row"><span class="muted">À</span><span>${escapeHtml(recipients)}</span></div>
          <div class="row"><span class="muted">Objet</span><span>${escapeHtml(options.subject || "(sans objet)")}</span></div>
        </div>
        <div class="question">Me rappeler de relancer si pas ouvert ?</div>
        <div class="choices" role="radiogroup">
          ${CHOICES.map(
            (choice) =>
              `<button type="button" class="choice" role="radio" data-value="${choice.value}" aria-checked="${choice.value === followUp}">${choice.label}</button>`,
          ).join("")}
        </div>
        <div class="actions">
          <button type="button" class="secondary" data-action="skip">Envoyer sans suivi</button>
          <button type="button" class="primary" data-action="track">Envoyer suivi</button>
        </div>
        <div class="hint muted">Entrée : envoyer suivi · Échap : revenir au brouillon</div>
      </div>`;

    function finish(result: PanelResult): void {
      document.removeEventListener("keydown", onKey, true);
      host.remove();
      resolve(result);
    }

    function onKey(event: KeyboardEvent): void {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        finish({ action: "track", followUpDays: followUp });
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish({ action: "cancel" });
      }
    }

    shadow.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest("button");
      if (!target) return;
      if (target.dataset.value !== undefined) {
        followUp = Number(target.dataset.value) as FollowUpChoice;
        for (const choice of shadow.querySelectorAll(".choice")) {
          choice.setAttribute("aria-checked", String(choice === target));
        }
        return;
      }
      if (target.dataset.action === "skip") finish({ action: "skip" });
      if (target.dataset.action === "track") finish({ action: "track", followUpDays: followUp });
    });

    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(host);
    shadow.querySelector<HTMLButtonElement>(".primary")?.focus();
  });
}

/** Small transient message in the corner (success or error). */
export function toast(message: string, tone: "ok" | "error" = "ok"): void {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      div {
        position: fixed; right: 24px; bottom: 24px; z-index: 2147483647; max-width: 340px;
        padding: 10px 14px; border-radius: 10px; color: #fff;
        font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
        background: ${tone === "ok" ? "#15803d" : "#b91c1c"}; box-shadow: 0 8px 24px rgba(0,0,0,.2);
      }
    </style>
    <div role="status">${escapeHtml(message)}</div>`;
  document.body.appendChild(host);
  setTimeout(() => host.remove(), tone === "ok" ? 2500 : 6000);
}
