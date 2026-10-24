import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root("./"),
      // `server-only` lanza un error fuera de Next; en pruebas lo reemplazamos.
      "server-only": root("./tests/stubs/empty.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
