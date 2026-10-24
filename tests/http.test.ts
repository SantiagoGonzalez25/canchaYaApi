import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { parseBody, parseQuery, route } from "@/lib/http";
import { reportQuerySchema } from "@/lib/schemas";

describe("route()", () => {
  it("traduce ApiError a { error: { code, message } } con su status", async () => {
    const handler = route(async () => {
      throw new ApiError(409, "NO_CAPACITY", "Sin cupos");
    });
    const response = await handler(new Request("http://x/api"), undefined);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "NO_CAPACITY", message: "Sin cupos" },
    });
  });

  it("traduce errores de validación a 400", async () => {
    const handler = route(async (request) => {
      await parseBody(request, z.object({ n: z.number() }));
      return Response.json({ ok: true });
    });
    const response = await handler(
      new Request("http://x/api", { method: "POST", body: JSON.stringify({ n: "a" }) }),
      undefined,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("responde 400 si el cuerpo no es JSON", async () => {
    const handler = route(async (request) => Response.json(await parseBody(request, z.object({}))));
    const response = await handler(
      new Request("http://x/api", { method: "POST", body: "no-json" }),
      undefined,
    );
    expect(response.status).toBe(400);
  });

  it("oculta los detalles de errores inesperados", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = route(async () => {
      throw new Error("secreto interno de Firestore");
    });
    const response = await handler(new Request("http://x/api"), undefined);
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(text).not.toContain("secreto");
    spy.mockRestore();
  });
});

describe("parseQuery()", () => {
  it("valida y transforma los query params", () => {
    const request = new Request("http://x/api?groupBy=sex&status=present");
    const query = parseQuery(request, reportQuerySchema);
    expect(query.groupBy).toBe("sex");
    expect(query.status).toBe("present");
  });
});
