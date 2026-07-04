import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.mov"],
  resolve: {
    alias: {
      "@sports-match/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // The ported prototype SCSS (and bootstrap 5) still use @import.
        quietDeps: true,
        silenceDeprecations: ["import", "global-builtin", "color-functions"],
      },
    },
  },
  server: {
    port: 3000,
    proxy: { "/api": "http://localhost:4000" },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
