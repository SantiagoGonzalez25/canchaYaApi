import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/image";

const bytes = (...values: number[]) => Uint8Array.from(values);

describe("sniffImageType", () => {
  it("reconoce JPEG, PNG y WebP por sus bytes iniciales", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      "image/png",
    );
    const webp = Uint8Array.from(
      [..."RIFF"].map((char) => char.charCodeAt(0)).concat(
        [0, 0, 0, 0],
        [..."WEBP"].map((char) => char.charCodeAt(0)),
      ),
    );
    expect(sniffImageType(webp)).toBe("image/webp");
  });

  it("rechaza archivos que no son imágenes", () => {
    expect(sniffImageType(new TextEncoder().encode("<html>no</html>"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});
