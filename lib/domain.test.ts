import { describe, expect, it } from "vitest";

process.env.COMPANY_DOMAIN = "scaler.com";
const { isAllowedGoogleProfile } = await import("./domain");

const ok = { email: "a@scaler.com", email_verified: true, hd: "scaler.com" };

describe("isAllowedGoogleProfile", () => {
  it("admits verified Workspace users on the company domain", () => {
    expect(isAllowedGoogleProfile(ok)).toBe(true);
  });
  it("rejects personal Gmail, other domains, unverified and missing hd", () => {
    expect(isAllowedGoogleProfile({ email: "a@gmail.com", email_verified: true })).toBe(false);
    expect(isAllowedGoogleProfile({ ...ok, hd: "evil.com", email: "a@evil.com" })).toBe(false);
    expect(isAllowedGoogleProfile({ ...ok, email_verified: false })).toBe(false);
    expect(isAllowedGoogleProfile({ ...ok, hd: undefined })).toBe(false);
    expect(isAllowedGoogleProfile({ ...ok, email: "a@scaler.com.evil.com" })).toBe(false);
    expect(isAllowedGoogleProfile(undefined)).toBe(false);
  });
});
