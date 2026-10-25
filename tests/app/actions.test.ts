import { beforeEach, describe, expect, it, vi } from "vitest";

const markEmailOpensAsRead = vi.fn();
vi.mock("@/lib/services/notifications", () => ({
  markEmailOpensAsRead: (...args: unknown[]) => markEmailOpensAsRead(...args),
}));

vi.mock("@/lib/services/emails", () => ({
  createEmail: vi.fn(),
  createEmailSchema: { safeParse: vi.fn() },
  deleteEmail: vi.fn(),
  updateEmail: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { markEmailOpensReadAction } = await import("@/app/(app)/actions");

describe("markEmailOpensReadAction", () => {
  beforeEach(() => {
    markEmailOpensAsRead.mockReset();
  });

  it("delegates to the notifications service and returns the count", async () => {
    markEmailOpensAsRead.mockResolvedValue(2);
    const result = await markEmailOpensReadAction("e1");
    expect(result).toBe(2);
    expect(markEmailOpensAsRead).toHaveBeenCalledWith("e1");
  });
});
