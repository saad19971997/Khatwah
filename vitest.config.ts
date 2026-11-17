import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@config": path.resolve(__dirname, "config"),
      // `server-only` throws outside the React server runtime; it is a no-op in unit tests.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
});
