import { describe, expect, it } from "vitest";

import { isSharedFreeHost } from "@/lib/env";

describe("isSharedFreeHost", () => {
  it("détecte les domaines Vercel partagés", () => {
    expect(isSharedFreeHost("mon-app.vercel.app")).toBe(true);
  });

  it("accepte un domaine personnel", () => {
    expect(isSharedFreeHost("t.mondomaine.dev")).toBe(false);
  });
});
