import { describe, it, expect } from "vitest";
import { analyzeImageBuffer, VISION_MODEL_VERSION } from "./vision-engine";

describe("vision-engine stub", () => {
  it("retorna resultado determinístico para o mesmo buffer", () => {
    const buf = Buffer.from("fake-jpeg-bytes-test-123");
    const a = analyzeImageBuffer(buf, "image/jpeg");
    const b = analyzeImageBuffer(buf, "image/jpeg");
    expect(a.modeloVersao).toBe(VISION_MODEL_VERSION);
    expect(a.sumario).toBe(b.sumario);
    expect(a.deteccoes.length).toBeGreaterThan(0);
  });
});
