const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("fr", {
  numeric: "auto",
});

/** "il y a 2 heures" / "à l'instant" — client-safe, no timezone needed. */
export function formatRelativeFr(
  date: Date | string,
  now: Date = new Date(),
): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const diffSeconds = Math.round((target.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) return "à l'instant";

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return RELATIVE_FORMATTER.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return RELATIVE_FORMATTER.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return RELATIVE_FORMATTER.format(diffDays, "day");
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return RELATIVE_FORMATTER.format(diffMonths, "month");
  }

  const diffYears = Math.round(diffMonths / 12);
  return RELATIVE_FORMATTER.format(diffYears, "year");
}

/** Full date + time in a given IANA timezone, for the hover tooltip. */
export function formatExactFr(date: Date | string, timeZone: string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone,
  }).format(target);
}
