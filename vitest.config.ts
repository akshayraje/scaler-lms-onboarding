import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // Lets tests import server-only modules (e.g. answer keys) outside Next.
      "server-only": path.resolve(__dirname, "lib/test/empty.ts"),
    },
  },
  esbuild: { jsx: "automatic" },
});
