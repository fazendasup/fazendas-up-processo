import { describe, expect, it } from "vitest";
import { startOfYmdInTimeZone, ymdInTimeZone, zonedStartOfDay } from "./zoned-day";

describe("zoned-day", () => {
  it("ymdInTimeZone matches wall calendar in America/Sao_Paulo", () => {
    const utcMid = new Date("2025-04-07T03:00:00.000Z");
    expect(ymdInTimeZone(utcMid, "America/Sao_Paulo")).toBe("2025-04-07");
  });

  it("startOfYmdInTimeZone yields midnight in zone", () => {
    const t = startOfYmdInTimeZone("2025-04-07", "America/Sao_Paulo");
    expect(ymdInTimeZone(t, "America/Sao_Paulo")).toBe("2025-04-07");
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(t);
    const hh = Number(parts.find((p) => p.type === "hour")?.value);
    const mm = Number(parts.find((p) => p.type === "minute")?.value);
    const ss = Number(parts.find((p) => p.type === "second")?.value);
    expect(hh).toBe(0);
    expect(mm).toBe(0);
    expect(ss).toBe(0);
  });

  it("zonedStartOfDay is stable for same calendar day", () => {
    const ref = new Date("2025-06-15T18:30:00.000Z");
    const s = zonedStartOfDay(ref, "America/Caracas");
    expect(ymdInTimeZone(s, "America/Caracas")).toBe(ymdInTimeZone(ref, "America/Caracas"));
  });
});
