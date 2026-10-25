import { beforeEach, describe, expect, it, vi } from "vitest";

let selectRows: unknown[] = [];
const insertValues = vi.fn((_data?: unknown) => Promise.resolve(undefined));
const insert = vi.fn((_table?: unknown) => ({ values: insertValues }));

let updateReturningRows: unknown[] = [];
const updateSet = vi.fn((_data?: unknown) => ({
  where: (_cond?: unknown) => ({
    returning: () => Promise.resolve(updateReturningRows),
  }),
}));
const update = vi.fn((_table?: unknown) => ({ set: updateSet }));

let deleteReturningRows: unknown[] = [];
const del = vi.fn((_table?: unknown) => ({
  where: (_cond?: unknown) => ({
    returning: () => Promise.resolve(deleteReturningRows),
  }),
}));

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self;
  chain.leftJoin = self;
  chain.innerJoin = self;
  chain.where = self;
  chain.groupBy = self;
  chain.orderBy = self;
  chain.limit = self;
  chain.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(selectRows).then(resolve, reject);
  return chain;
}
const select = vi.fn((_cols?: unknown) => makeSelectChain());

const findFirst = vi.fn((_arg?: unknown) => Promise.resolve(undefined as unknown));
const findMany = vi.fn((_arg?: unknown) => Promise.resolve([] as unknown[]));

vi.mock("@/db", () => ({
  db: {
    select: (...args: [unknown?]) => select(...args),
    insert: (...args: [unknown?]) => insert(...args),
    update: (...args: [unknown?]) => update(...args),
    delete: (...args: [unknown?]) => del(...args),
    query: {
      trackedEmails: { findFirst: (arg: unknown) => findFirst(arg) },
      openEvents: { findMany: (arg: unknown) => findMany(arg) },
    },
  },
  trackedEmails: { id: "tracked_emails.id", archived: "tracked_emails.archived" },
  openEvents: { id: "open_events.id", emailId: "open_events.email_id" },
}));

vi.mock("@/lib/env", () => ({
  env: {
    GRACE_PERIOD_SECONDS: 180,
    DEDUP_WINDOW_SECONDS: 60,
    PUBLIC_BASE_URL: "https://t.example.dev",
  },
}));

const {
  createEmail,
  createEmailSchema,
  deleteEmail,
  getEmailById,
  listEmails,
  listEmailsQuerySchema,
  updateEmail,
  updateEmailSchema,
} = await import("@/lib/services/emails");

describe("createEmailSchema", () => {
  it("requires a non-empty label", () => {
    expect(createEmailSchema.safeParse({ label: "" }).success).toBe(false);
    expect(createEmailSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a label with optional recipient and notes", () => {
    const result = createEmailSchema.safeParse({
      label: "Candidature X",
      recipient: "rh@x.com",
      notes: "suivi",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateEmailSchema", () => {
  it("rejects an empty patch", () => {
    expect(updateEmailSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a partial patch", () => {
    expect(updateEmailSchema.safeParse({ archived: true }).success).toBe(true);
  });
});

describe("listEmailsQuerySchema", () => {
  it("transforms archived string to boolean", () => {
    const result = listEmailsQuerySchema.parse({ archived: "true" });
    expect(result.archived).toBe(true);
  });

  it("rejects an invalid status", () => {
    expect(listEmailsQuerySchema.safeParse({ status: "bogus" }).success).toBe(
      false,
    );
  });
});

describe("createEmail", () => {
  beforeEach(() => {
    insertValues.mockClear();
  });

  it("creates a 21-char id, arms it after the grace period, and returns the pixel tag", async () => {
    const result = await createEmail({ label: "Candidature X" });

    expect(result.id).toHaveLength(21);
    expect(result.pixelUrl).toBe(`https://t.example.dev/p/${result.id}.gif`);
    expect(result.imgTag).toContain(result.pixelUrl);

    expect(insertValues).toHaveBeenCalledOnce();
    const inserted = insertValues.mock.calls[0][0] as {
      id: string;
      label: string;
      recipient: string | null;
      notes: string | null;
      createdAt: Date;
      armedAt: Date;
    };
    expect(inserted.id).toBe(result.id);
    expect(inserted.label).toBe("Candidature X");
    expect(inserted.recipient).toBeNull();
    expect(
      inserted.armedAt.getTime() - inserted.createdAt.getTime(),
    ).toBe(180_000);
  });
});

describe("listEmails", () => {
  it("filters rows with opens > 0 for status=opened", async () => {
    selectRows = [
      { id: "a", opens: 2 },
      { id: "b", opens: 0 },
    ];
    const rows = await listEmails({ status: "opened", archived: undefined });
    expect(rows).toEqual([{ id: "a", opens: 2 }]);
  });

  it("filters rows with opens = 0 for status=pending", async () => {
    selectRows = [
      { id: "a", opens: 2 },
      { id: "b", opens: 0 },
    ];
    const rows = await listEmails({ status: "pending", archived: undefined });
    expect(rows).toEqual([{ id: "b", opens: 0 }]);
  });

  it("returns everything with no status filter", async () => {
    selectRows = [{ id: "a", opens: 2 }, { id: "b", opens: 0 }];
    const rows = await listEmails({ archived: undefined });
    expect(rows).toHaveLength(2);
  });
});

describe("getEmailById", () => {
  beforeEach(() => {
    findFirst.mockReset();
    findMany.mockReset();
  });

  it("returns null for an unknown id", async () => {
    findFirst.mockResolvedValue(undefined);
    expect(await getEmailById("unknown")).toBeNull();
  });

  it("computes opens, first and last opened from the open events", async () => {
    findFirst.mockResolvedValue({
      id: "e1",
      label: "Test",
      recipient: null,
      notes: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      armedAt: new Date("2026-01-01T00:03:00Z"),
      archived: false,
    });
    findMany.mockResolvedValue([
      { id: 2, openedAt: new Date("2026-01-02T00:00:00Z"), client: "gmail", country: "MA", emailId: "e1", userAgent: null, seenAt: null },
      { id: 1, openedAt: new Date("2026-01-01T00:10:00Z"), client: "outlook", country: "FR", emailId: "e1", userAgent: null, seenAt: null },
    ]);

    const email = await getEmailById("e1");
    expect(email?.opens).toBe(2);
    expect(email?.lastOpenedAt).toEqual(new Date("2026-01-02T00:00:00Z"));
    expect(email?.firstOpenedAt).toEqual(new Date("2026-01-01T00:10:00Z"));
    expect(email?.openEvents).toHaveLength(2);
  });
});

describe("updateEmail", () => {
  it("returns null when no row was updated", async () => {
    updateReturningRows = [];
    expect(await updateEmail("missing", { archived: true })).toBeNull();
  });

  it("returns the updated row", async () => {
    updateReturningRows = [{ id: "e1", archived: true }];
    const updated = await updateEmail("e1", { archived: true });
    expect(updated).toEqual({ id: "e1", archived: true });
    expect(updateSet).toHaveBeenCalledWith({ archived: true });
  });
});

describe("deleteEmail", () => {
  it("returns false when nothing was deleted", async () => {
    deleteReturningRows = [];
    expect(await deleteEmail("missing")).toBe(false);
  });

  it("returns true when a row was deleted", async () => {
    deleteReturningRows = [{ id: "e1" }];
    expect(await deleteEmail("e1")).toBe(true);
  });
});
