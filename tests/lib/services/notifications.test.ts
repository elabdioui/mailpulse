import { beforeEach, describe, expect, it, vi } from "vitest";

let countRows: Array<{ count: number }> = [{ count: 0 }];
let notificationRows: unknown[] = [];

function makeSelectChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self;
  chain.innerJoin = self;
  chain.where = self;
  chain.orderBy = self;
  chain.limit = self;
  chain.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

let selectCallCount = 0;
const select = vi.fn((_cols?: unknown) => {
  selectCallCount += 1;
  return selectCallCount % 2 === 1
    ? makeSelectChain(countRows)
    : makeSelectChain(notificationRows);
});

let updateReturningRows: unknown[] = [];
const updateSet = vi.fn((_data?: unknown) => ({
  where: (_cond?: unknown) => ({
    returning: () => Promise.resolve(updateReturningRows),
  }),
}));
const update = vi.fn((_table?: unknown) => ({ set: updateSet }));

vi.mock("@/db", () => ({
  db: {
    select: (...args: [unknown?]) => select(...args),
    update: (...args: [unknown?]) => update(...args),
  },
  trackedEmails: { id: "tracked_emails.id", label: "tracked_emails.label" },
  openEvents: {
    id: "open_events.id",
    emailId: "open_events.email_id",
    seenAt: "open_events.seen_at",
    openedAt: "open_events.opened_at",
  },
}));

const {
  listUnreadNotifications,
  markNotificationsRead,
  markReadSchema,
  notificationsQuerySchema,
} = await import("@/lib/services/notifications");

describe("notificationsQuerySchema", () => {
  it("accepts a missing since", () => {
    expect(notificationsQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts a valid ISO datetime", () => {
    expect(
      notificationsQuerySchema.safeParse({ since: "2026-01-01T00:00:00.000Z" })
        .success,
    ).toBe(true);
  });

  it("rejects an invalid since", () => {
    expect(
      notificationsQuerySchema.safeParse({ since: "not-a-date" }).success,
    ).toBe(false);
  });
});

describe("markReadSchema", () => {
  it("accepts no ids (mark all read)", () => {
    expect(markReadSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a list of positive ids", () => {
    expect(markReadSchema.safeParse({ ids: [1, 2, 3] }).success).toBe(true);
  });

  it("rejects non-positive ids", () => {
    expect(markReadSchema.safeParse({ ids: [0, -1] }).success).toBe(false);
  });
});

describe("listUnreadNotifications", () => {
  beforeEach(() => {
    selectCallCount = 0;
  });

  it("returns the unread count and notifications", async () => {
    countRows = [{ count: 3 }];
    notificationRows = [
      { id: 1, emailId: "e1", emailLabel: "Test", openedAt: new Date(), client: "gmail" },
    ];
    const result = await listUnreadNotifications();
    expect(result.count).toBe(3);
    expect(result.notifications).toHaveLength(1);
  });
});

describe("markNotificationsRead", () => {
  it("marks all unread when no ids are given", async () => {
    updateReturningRows = [{ id: 1 }, { id: 2 }];
    const count = await markNotificationsRead(undefined);
    expect(count).toBe(2);
  });

  it("marks only the given ids", async () => {
    updateReturningRows = [{ id: 5 }];
    const count = await markNotificationsRead([5]);
    expect(count).toBe(1);
  });
});
