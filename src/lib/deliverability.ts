import { HEALTHCHECK_ID } from "@/lib/tracking";
import { env, isSharedFreeHost } from "@/lib/env";
import { PIXEL_RESPONSE_HEADERS, TRANSPARENT_GIF_BUFFER } from "@/lib/pixel";

export type CheckStatus = "pass" | "warn" | "fail";

export interface DeliverabilityCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
}

export interface DeliverabilityReport {
  checks: DeliverabilityCheck[];
  checkedAt: string;
}

/** Response time target for the pixel, from spec section 5. */
const PIXEL_RESPONSE_TARGET_MS = 150;

export function checkHttps(baseUrl: string = env.PUBLIC_BASE_URL): DeliverabilityCheck {
  const pass = baseUrl.startsWith("https://");
  return {
    id: "https",
    label: "PUBLIC_BASE_URL en HTTPS",
    status: pass ? "pass" : "fail",
    detail: pass
      ? `${baseUrl} est bien servi en HTTPS.`
      : `${baseUrl} ne commence pas par https://.`,
    fix: pass
      ? undefined
      : "Mets à jour PUBLIC_BASE_URL pour qu'il commence par https://.",
  };
}

export function checkSharedHost(
  baseUrl: string = env.PUBLIC_BASE_URL,
): DeliverabilityCheck {
  let hostname: string;
  try {
    hostname = new URL(baseUrl).hostname;
  } catch {
    return {
      id: "shared-host",
      label: "Domaine personnel",
      status: "fail",
      detail: `PUBLIC_BASE_URL (${baseUrl}) n'est pas une URL valide.`,
      fix: "Corrige PUBLIC_BASE_URL dans les variables d'environnement.",
    };
  }

  const shared = isSharedFreeHost(hostname);
  return {
    id: "shared-host",
    label: "Domaine personnel",
    status: shared ? "fail" : "pass",
    detail: shared
      ? `${hostname} est un domaine partagé gratuit, souvent associé au phishing.`
      : `${hostname} est un domaine personnel.`,
    fix: shared
      ? "Utilise un sous-domaine d'un domaine personnel (ex. t.mondomaine.dev) plutôt qu'un domaine partagé gratuit."
      : undefined,
  };
}

interface PixelProbeResult {
  reachable: boolean;
  status: number;
  redirected: boolean;
  contentType: string | null;
  contentLength: string | null;
  hasSetCookie: boolean;
  durationMs: number;
  errorMessage?: string;
}

async function probeHealthcheckPixel(
  baseUrl: string,
  fetchImpl: typeof fetch,
): Promise<PixelProbeResult> {
  const url = `${baseUrl}/p/${HEALTHCHECK_ID}.gif`;
  const start = Date.now();

  try {
    const response = await fetchImpl(url, {
      redirect: "manual",
      cache: "no-store",
    });
    const durationMs = Date.now() - start;
    const redirected = response.status >= 300 && response.status < 400;

    return {
      reachable: true,
      status: response.status,
      redirected,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      hasSetCookie: response.headers.has("set-cookie"),
      durationMs,
    };
  } catch (error) {
    return {
      reachable: false,
      status: 0,
      redirected: false,
      contentType: null,
      contentLength: null,
      hasSetCookie: false,
      durationMs: Date.now() - start,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildPixelResponseCheck(
  probe: PixelProbeResult,
): DeliverabilityCheck {
  if (!probe.reachable) {
    return {
      id: "pixel-response",
      label: "Réponse du pixel de test",
      status: "fail",
      detail: `Impossible de joindre /p/${HEALTHCHECK_ID}.gif : ${probe.errorMessage ?? "erreur réseau"}.`,
      fix: "Vérifie que l'app est bien déployée et accessible publiquement à l'adresse configurée.",
    };
  }

  const expectedLength = String(TRANSPARENT_GIF_BUFFER.byteLength);
  const problems: string[] = [];
  if (probe.status !== 200) problems.push(`statut ${probe.status} au lieu de 200`);
  if (probe.contentType !== PIXEL_RESPONSE_HEADERS["Content-Type"]) {
    problems.push(`Content-Type "${probe.contentType ?? "absent"}" au lieu de "${PIXEL_RESPONSE_HEADERS["Content-Type"]}"`);
  }
  if (probe.contentLength !== expectedLength) {
    problems.push(`Content-Length "${probe.contentLength ?? "absent"}" au lieu de "${expectedLength}"`);
  }
  if (probe.hasSetCookie) problems.push("un en-tête Set-Cookie est présent");

  const slow = probe.durationMs > PIXEL_RESPONSE_TARGET_MS;

  if (problems.length > 0) {
    return {
      id: "pixel-response",
      label: "Réponse du pixel de test",
      status: "fail",
      detail: `Problème(s) détecté(s) sur /p/${HEALTHCHECK_ID}.gif : ${problems.join(", ")} (réponse en ${probe.durationMs} ms).`,
      fix: "Vérifie la route /p/[id] : elle doit toujours renvoyer le GIF 43 octets avec les en-têtes exacts de la section 5, sans cookie.",
    };
  }

  return {
    id: "pixel-response",
    label: "Réponse du pixel de test",
    status: slow ? "warn" : "pass",
    detail: slow
      ? `Réponse correcte mais lente : ${probe.durationMs} ms (objectif : moins de ${PIXEL_RESPONSE_TARGET_MS} ms).`
      : `Statut 200, image/gif, 43 octets, aucun cookie, en ${probe.durationMs} ms.`,
    fix: slow
      ? "Vérifie que l'enregistrement du suivi se fait bien après la réponse (after()/waitUntil), sans bloquer le pixel."
      : undefined,
  };
}

export function buildNoRedirectCheck(probe: PixelProbeResult): DeliverabilityCheck {
  if (!probe.reachable) {
    return {
      id: "no-redirect",
      label: "Pas de redirection",
      status: "fail",
      detail: `Impossible de vérifier : /p/${HEALTHCHECK_ID}.gif n'a pas pu être joint.`,
      fix: "Vérifie que l'app est bien déployée et accessible publiquement à l'adresse configurée.",
    };
  }

  return {
    id: "no-redirect",
    label: "Pas de redirection",
    status: probe.redirected ? "fail" : "pass",
    detail: probe.redirected
      ? `L'hôte redirige (statut ${probe.status}) au lieu de répondre directement.`
      : "L'hôte du pixel répond directement, sans redirection.",
    fix: probe.redirected
      ? "Configure le domaine principal dans Vercel (Settings > Domains) pour éviter toute redirection apex ↔ www."
      : undefined,
  };
}

export async function getDeliverabilityReport(options?: {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}): Promise<DeliverabilityReport> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? env.PUBLIC_BASE_URL;

  const probe = await probeHealthcheckPixel(baseUrl, fetchImpl);

  return {
    checks: [
      checkHttps(baseUrl),
      checkSharedHost(baseUrl),
      buildPixelResponseCheck(probe),
      buildNoRedirectCheck(probe),
    ],
    checkedAt: new Date().toISOString(),
  };
}
