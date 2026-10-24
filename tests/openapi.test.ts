import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Validator } from "@seriousme/openapi-schema-validator";
import { describe, expect, it } from "vitest";
import { buildOpenApiSpec } from "@/lib/openapi";

const API_ROOT = join(process.cwd(), "app", "api");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

function routeFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...routeFiles(full));
    else if (entry.name === "route.ts") files.push(full);
  }
  return files;
}

function actualOperations(): string[] {
  const operations: string[] = [];
  for (const file of routeFiles(API_ROOT)) {
    const relative = file
      .slice(API_ROOT.length)
      .replaceAll("\\", "/")
      .replace(/\/route\.ts$/, "")
      .replace(/\[([^\]]+)\]/g, "{$1}");
    const path = `/api${relative}`;
    const content = readFileSync(file, "utf8");
    for (const method of METHODS) {
      const pattern = new RegExp(
        `export\\s+(?:async\\s+)?(?:const|function)\\s+${method}\\b`,
      );
      if (pattern.test(content)) operations.push(`${method} ${path}`);
    }
  }
  return operations.sort();
}

function documentedOperations(spec: Record<string, unknown>): string[] {
  const paths = spec.paths as Record<string, Record<string, unknown>>;
  const operations: string[] = [];
  for (const [path, value] of Object.entries(paths)) {
    for (const method of METHODS) {
      if (value[method.toLowerCase()]) operations.push(`${method} ${path}`);
    }
  }
  return operations.sort();
}

describe("OpenAPI", () => {
  it("es una especificación OpenAPI 3.1 válida", async () => {
    const validator = new Validator();
    const result = await validator.validate(buildOpenApiSpec());
    if (!result.valid) console.error(result.errors);
    expect(result.valid).toBe(true);
  });

  it("documenta exactamente las rutas y métodos que existen en app/api", () => {
    expect(documentedOperations(buildOpenApiSpec())).toEqual(actualOperations());
  });

  it("incluye los módulos del dominio ACUDES", () => {
    const paths = buildOpenApiSpec().paths as Record<string, unknown>;
    for (const path of [
      "/api/acudes/live",
      "/api/acudes",
      "/api/scenarios/occupation",
      "/api/enrollments",
      "/api/enrollments/me",
      "/api/enrollments/{id}/cancel",
      "/api/attendance",
      "/api/reports/enrollments",
      "/api/reports/attendance",
      "/api/auth/manager-register",
    ]) {
      expect(paths).toHaveProperty(path);
    }
  });

  it("no documenta ningún endpoint de reservas", () => {
    const paths = Object.keys(buildOpenApiSpec().paths as Record<string, unknown>);
    expect(paths.some((path) => path.includes("reservation") || path.includes("booking"))).toBe(
      false,
    );
  });
});
