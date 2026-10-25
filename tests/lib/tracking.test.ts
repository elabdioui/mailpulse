import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn((_arg?: unknown) => Promise.resolve(undefined as unknown));
const findMany = vi.fn((_arg?: unknown) => Promise.resolve([] as unknown[]));
const values = vi.fn((_arg?: unknown) => Promise.resolve(undefined));
const insert = vi.fn((_arg?: unknown) => ({ values }));

vi.mock("@/db", () => ({
  db: {
    query: {
      trackedEmails: { findFirst: (arg: unknown) => findFirst(arg) },
      openEvents: { findMany: (arg: unknown) => findMany(arg) },
    },
    insert: (arg: unknown) => insert(arg),
  },
  trackedEmails: { id: "tracked_emails.id" },
  openEvents: { emailId: "open_events.email_id", openedAt: "open_events.opened_at" },
}));

const {
  classifyClient,
  truncateUserAgent,
  isArmed,
  isDuplicateOpen,
  normalizePixelId,
  recordOpen,
  HEALTHCHECK_ID,
  USER_AGENT_MAX_LENGTH,
} = await import("@/lib/tracking");

describe("normalizePixelId", () => {
  it("strips the .gif suffix", () => {
    expect(normalizePixelId("abc123.gif")).toBe("abc123");
  });

  it("leaves an id without extension untouched", () => {
    expect(normalizePixelId("abc123")).toBe("abc123");
  });

  it("leaves a malformed id untouched", () => {
    expect(normalizePixelId("!!!")).toBe("!!!");
  });
});

describe("classifyClient", () => {
  it("detects Gmail via the image proxy", () => {
    expect(classifyClient("Mozilla/5.0 GoogleImageProxy")).toBe("gmail");
  });

  it("detects Yahoo via its mail proxy", () => {
    expect(classifyClient("YahooMailProxy; https://help.yahoo.com")).toBe(
      "yahoo",
    );
  });

  it("detects Outlook", () => {
    expect(classifyClient("Microsoft Office/16.0")).toBe("outlook");
    expect(classifyClient("Outlook-iOS/1.0")).toBe("outlook");
    expect(classifyClient("ms-office")).toBe("outlook");
  });

  it("falls back to apple_or_other for a generic browser UA", () => {
    expect(
      classifyClient(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15",
      ),
    ).toBe("apple_or_other");
  });

  it("returns unknown for an empty or missing UA", () => {
    expect(classifyClient("")).toBe("unknown");
    expect(classifyClient(null)).toBe("unknown");
    expect(classifyClient(undefined)).toBe("unknown");
    expect(classifyClient("   ")).toBe("unknown");
  });
});

describe("truncateUserAgent", () => {
  it("returns null for a missing UA", () => {
    expect(truncateUserAgent(null)).toBeNull();
  });

  it("truncates to the max length", () => {
    const long = "a".repeat(USER_AGENT_MAX_LENGTH + 50);
    const result = truncateUserAgent(long);
    expect(result).toHaveLength(USER_AGENT_MAX_LENGTH);
  });

  it("leaves a short UA untouched", () => {
    expect(truncateUserAgent("short-ua")).toBe("short-ua");
  });
});

describe("isArmed", () => {
  it("is false before armedAt (grace period)", () => {
    const armedAt = new Date("2026-01-01T00:03:00Z");
    const now = new Date("2026-01-01T00:02:59Z");
    expect(isArmed(now, armedAt)).toBe(false);
  });

  it("is true at or after armedAt", () => {
    const armedAt = new Date("2026-01-01T00:03:00Z");
    expect(isArmed(new Date("2026-01-01T00:03:00Z"), armedAt)).toBe(true);
    expect(isArmed(new Date("2026-01-01T00:03:01Z"), armedAt)).toBe(true);
  });
});

describe("isDuplicateOpen", () => {
  const now = new Date("2026-01-01T00:10:00Z");

  it("is false with no recent opens", () => {
    expect(isDuplicateOpen([], "gmail", now, 60)).toBe(false);
  });

  it("is true when the same client opened within the window", () => {
    const recentOpens = [
      { client: "gmail", openedAt: new Date("2026-01-01T00:09:30Z") },
    ];
    expect(isDuplicateOpen(recentOpens, "gmail", now, 60)).toBe(true);
  });

  it("is false when the same client opened outside the window", () => {
    const recentOpens = [
      { client: "gmail", openedAt: new Date("2026-01-01T00:08:00Z") },
    ];
    expect(isDuplicateOpen(recentOpens, "gmail", now, 60)).toBe(false);
  });

  it("is false when a different client opened within the window", () => {
    const recentOpens = [
      { client: "outlook", openedAt: new Date("2026-01-01T00:09:30Z") },
    ];
    expect(isDuplicateOpen(recentOpens, "gmail", now, 60)).toBe(false);
  });
});

describe("recordOpen", () => {
  beforeEach(() => {
    findFirst.mockReset();
    findMany.mockReset();
    insert.mockReset();
    values.mockReset();
    values.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("does nothing for the reserved healthcheck id", async () => {
    await recordOpen({ id: HEALTHCHECK_ID, userAgent: "ua", country: null });
    expect(findFirst).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("does nothing when the id is unknown", async () => {
    findFirst.mockResolvedValue(undefined);
    await recordOpen({ id: "unknown-id", userAgent: "ua", country: null });
    expect(insert).not.toHaveBeenCalled();
  });

  it("ignores opens before the grace period ends", async () => {
    const now = new Date("2026-01-01T00:00:00Z");
    findFirst.mockResolvedValue({
      id: "e1",
      armedAt: new Date("2026-01-01T00:03:00Z"),
    });
    await recordOpen({ id: "e1", userAgent: "ua", country: null, now });
    expect(findMany).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("ignores a duplicate open within the dedup window", async () => {
    const now = new Date("2026-01-01T00:10:00Z");
    findFirst.mockResolvedValue({
      id: "e1",
      armedAt: new Date("2026-01-01T00:00:00Z"),
    });
    findMany.mockResolvedValue([
      { client: "gmail", openedAt: new Date("2026-01-01T00:09:30Z") },
    ]);
    await recordOpen({
      id: "e1",
      userAgent: "Mozilla GoogleImageProxy",
      country: null,
      now,
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts an open event when armed and not a duplicate", async () => {
    const now = new Date("2026-01-01T00:10:00Z");
    findFirst.mockResolvedValue({
      id: "e1",
      armedAt: new Date("2026-01-01T00:00:00Z"),
    });
    findMany.mockResolvedValue([]);
    await recordOpen({
      id: "e1",
      userAgent: "Mozilla GoogleImageProxy",
      country: "MA",
      now,
    });
    expect(insert).toHaveBeenCalledOnce();
    expect(values).toHaveBeenCalledWith({
      emailId: "e1",
      client: "gmail",
      userAgent: "Mozilla GoogleImageProxy",
      country: "MA",
      openedAt: now,
    });
  });

  it("never throws when the database is unavailable", async () => {
    findFirst.mockRejectedValue(new Error("database unreachable"));
    await expect(
      recordOpen({ id: "e1", userAgent: "ua", country: null }),
    ).resolves.toBeUndefined();
    expect(insert).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
