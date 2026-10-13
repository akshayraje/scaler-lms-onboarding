import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "./safe-redirect";

describe("safeCallbackPath", () => {
  it("keeps internal paths", () => {
    expect(safeCallbackPath("/courses/posh-pocso")).toBe("/courses/posh-pocso");
    expect(safeCallbackPath("/admin?tab=audit")).toBe("/admin?tab=audit");
  });
  it("rejects external or odd targets", () => {
    for (const v of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, "/login", "/api/auth/signout"]) {
      expect(safeCallbackPath(v)).toBe("/");
    }
  });
});
