import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` throws when imported outside Next's bundle. Stub it
      // so server-only modules (e.g. lib/tutor/cost.ts) can be unit-tested.
      "server-only": fileURLToPath(
        new URL("./tests/__mocks__/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    globals: false,
    // Privacy guards use node:test and isolated Git repositories, not Vitest.
    exclude: [
      "node_modules", "legacy", ".next", ".sensitive-data-tools",
      "tests/e2e", "tests/privacy",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "components/widgets/*/model.ts",
        "components/widgets/*/reducer.ts",
        "components/widgets/*/data.ts",
        "lib/**/*.ts",
      ],
      exclude: ["**/index.tsx", "**/*.css", "**/*.test.ts"],
    },
  },
});
