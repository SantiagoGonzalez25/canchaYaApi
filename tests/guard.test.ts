import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";

const verifyIdToken = vi.fn();
const verifySessionCookie = vi.fn();
vi.mock("@/lib/services/auth", () => ({
  verifyIdToken: (token: string) => verifyIdToken(token),
  verifySessionCookie: (cookie: string) => verifySessionCookie(cookie),
}));

import { assertRole, requireAdmin, requireUser } from "@/lib/guard";

const request = (authorization?: string, cookie?: string) =>
  new Request("http://x/api", {
    headers: {
      ...(authorization ? { authorization } : {}),
      ...(cookie ? { cookie } : {}),
    },
  });

beforeEach(() => {
  verifyIdToken.mockReset();
  verifySessionCookie.mockReset();
});

describe("requireUser", () => {
  it("rechaza peticiones sin token ni cookie", async () => {
    await expect(requireUser(request())).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("rechaza esquemas distintos de Bearer", async () => {
    await expect(requireUser(request("Basic abc"))).rejects.toMatchObject({ status: 401 });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("verifica el idToken Bearer", async () => {
    const user = { uid: "u1", email: "a@b.co", name: "Ana", role: "student", sex: "female" };
    verifyIdToken.mockResolvedValue(user);
    await expect(requireUser(request("Bearer tok"))).resolves.toEqual(user);
    expect(verifyIdToken).toHaveBeenCalledWith("tok");
  });

  it("acepta la cookie httpOnly del panel web", async () => {
    const user = { uid: "u1", email: "a@b.co", name: "Ana", role: "manager", sex: null };
    verifySessionCookie.mockResolvedValue(user);
    await expect(requireUser(request(undefined, "canchaya_session=abc"))).resolves.toEqual(user);
    expect(verifySessionCookie).toHaveBeenCalledWith("abc");
  });
});

describe("assertRole", () => {
  const student = { uid: "u1", email: "a@b.co", name: "Ana", role: "student" as const, sex: null };
  const manager = { uid: "u2", email: "g@b.co", name: "G", role: "manager" as const, sex: null };
  it("permite el rol correcto", () => {
    expect(() => assertRole(student, "student")).not.toThrow();
  });
  it("permite varios roles", () => {
    expect(() => assertRole(student, ["manager", "admin"])).toThrow(ApiError);
  });
  it("lanza 403 si el rol no coincide", () => {
    try {
      assertRole(student, "manager");
      throw new Error("debía fallar");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
    }
  });
  it("solo el admin pasa requireAdmin", () => {
    expect(() => requireAdmin(manager)).toThrow(ApiError);
  });
});
