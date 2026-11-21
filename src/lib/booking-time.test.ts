import { describe, expect, it } from "vitest";
import { buildSlots, upcomingOpenDays, zonedToUtc, type BusinessHours } from "./booking-time";

const hours: BusinessHours = {
  open_time: "09:00:00",
  close_time: "18:00:00",
  slot_minutes: 60,
  closed_weekdays: [0],
  timezone: "America/Sao_Paulo",
};
// 2026-04-22 is a Wednesday. Noon before: everything that day is in the future.
const before = new Date("2026-04-21T12:00:00Z");

describe("booking slots", () => {
  it("converts São Paulo wall time to UTC (10:00 -> 13:00Z)", () => {
    expect(zonedToUtc("2026-04-24", "10:00", "America/Sao_Paulo").toISOString()).toBe(
      "2026-04-24T13:00:00.000Z",
    );
  });

  it("offers hourly slots from 09:00 while the service fits before 18:00", () => {
    const slots = buildSlots({ date: "2026-04-22", hours, durationMin: 60, busy: [], now: before });
    expect(slots.map((s) => s.label)).toEqual([
      "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    ]);
  });

  it("drops a 90 min service at 17:00 because it would end after closing", () => {
    const slots = buildSlots({ date: "2026-04-22", hours, durationMin: 90, busy: [], now: before });
    expect(slots.at(-1)?.label).toBe("16:00");
  });

  it("marks a slot unavailable when the professional is already booked", () => {
    const busy = [{ starts_at: "2026-04-22T13:00:00Z", ends_at: "2026-04-22T14:00:00Z" }];
    const slots = buildSlots({ date: "2026-04-22", hours, durationMin: 60, busy, now: before });
    expect(slots.find((s) => s.label === "10:00")?.available).toBe(false);
    expect(slots.find((s) => s.label === "11:00")?.available).toBe(true);
  });

  it("marks a 90 min slot unavailable when it runs into the next booking", () => {
    const busy = [{ starts_at: "2026-04-22T14:00:00Z", ends_at: "2026-04-22T15:00:00Z" }];
    const slots = buildSlots({ date: "2026-04-22", hours, durationMin: 90, busy, now: before });
    expect(slots.find((s) => s.label === "10:00")?.available).toBe(false);
  });

  it("marks past times of today unavailable", () => {
    const now = new Date("2026-04-22T14:30:00Z"); // 11:30 in São Paulo
    const slots = buildSlots({ date: "2026-04-22", hours, durationMin: 60, busy: [], now });
    expect(slots.find((s) => s.label === "11:00")?.available).toBe(false);
    expect(slots.find((s) => s.label === "12:00")?.available).toBe(true);
  });

  it("has no slots on Sunday (closed)", () => {
    expect(buildSlots({ date: "2026-04-26", hours, durationMin: 60, busy: [], now: before })).toEqual([]);
    expect(upcomingOpenDays("2026-04-25", hours, 2)).toEqual(["2026-04-25", "2026-04-27"]);
  });
});
