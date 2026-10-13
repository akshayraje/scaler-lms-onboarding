import { afterEach, describe, expect, it } from "vitest";
import { appBaseUrl, courseUrl } from "./urls";

describe("URLs from AUTH_URL", () => {
  const orig = process.env.AUTH_URL;
  afterEach(() => (process.env.AUTH_URL = orig));

  it("builds course links on the configured base, ignoring trailing slashes", () => {
    process.env.AUTH_URL = "https://lms.example.test/";
    expect(appBaseUrl()).toBe("https://lms.example.test");
    expect(courseUrl("posh-pocso")).toBe("https://lms.example.test/courses/posh-pocso");
  });
  it("falls back to localhost in development", () => {
    delete process.env.AUTH_URL;
    expect(courseUrl("posh-pocso")).toBe("http://localhost:3000/courses/posh-pocso");
  });
});
