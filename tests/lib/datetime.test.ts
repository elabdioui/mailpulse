import { describe, expect, it } from "vitest";

import { formatExactFr, formatRelativeFr } from "@/lib/datetime";

describe("formatRelativeFr", () => {
  const now = new Date("2026-01-15T12:00:00Z");

  it("returns 'à l'instant' for very recent dates", () => {
    expect(formatRelativeFr(new Date("2026-01-15T11:59:45Z"), now)).toBe(
      "à l'instant",
    );
  });

  it("formats minutes in the past", () => {
    expect(formatRelativeFr(new Date("2026-01-15T11:55:00Z"), now)).toBe(
      "il y a 5 minutes",
    );
  });

  it("formats hours in the past", () => {
    expect(formatRelativeFr(new Date("2026-01-15T10:00:00Z"), now)).toBe(
      "il y a 2 heures",
    );
  });

  it("formats days in the past", () => {
    expect(formatRelativeFr(new Date("2026-01-13T12:00:00Z"), now)).toBe(
      "avant-hier",
    );
    expect(formatRelativeFr(new Date("2026-01-10T12:00:00Z"), now)).toBe(
      "il y a 5 jours",
    );
  });

  it("formats future dates", () => {
    expect(formatRelativeFr(new Date("2026-01-15T12:10:00Z"), now)).toBe(
      "dans 10 minutes",
    );
  });

  it("accepts an ISO string", () => {
    expect(formatRelativeFr("2026-01-15T11:55:00Z", now)).toBe(
      "il y a 5 minutes",
    );
  });
});

describe("formatExactFr", () => {
  it("formats a date in the given timezone", () => {
    const result = formatExactFr(
      new Date("2026-01-15T12:00:00Z"),
      "Africa/Casablanca",
    );
    expect(result).toContain("2026");
    expect(result).toContain("13:00");
  });

  it("reflects a different timezone's offset", () => {
    const result = formatExactFr(
      new Date("2026-01-15T12:00:00Z"),
      "Pacific/Kiritimati",
    );
    expect(result).not.toContain("12:00");
  });
});
