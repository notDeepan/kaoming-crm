import { test, expect } from "@playwright/test";
import { convert, toSystem, formatMeasure, formatInSystem, peerUnit } from "../src/lib/units";

test("length converts mm ↔ inch and rounds sensibly (A5, Q-16)", () => {
  expect(convert(3000, "mm", "inch")).toBe(118.11);
  expect(convert(100, "inch", "mm")).toBe(2540); // mm shows whole numbers for machine dims
  // no six-decimal noise on print
  expect(formatMeasure({ value: 118.11023, unit: "inch" })).toBe("118.11 inch");
});

test("power kW ↔ HP and torque Nm ↔ ft-lb", () => {
  expect(convert(45, "kW", "HP")).toBe(60.3);
  expect(convert(120, "Nm", "ft-lb")).toBe(88.5);
});

test("table loading stays within its dimension; mass ≠ areal load", () => {
  expect(convert(3, "t", "kg")).toBe(3000);
  expect(convert(3000, "kg", "lb")).toBeCloseTo(6613.87, 0);
  expect(convert(3000, "kg/m²", "lb/ft²")).toBeCloseTo(614.5, 0);
  // cross-dimension is refused, not fudged
  expect(convert(3000, "kg", "kg/m²")).toBeNull();
});

test("peer + system selection maps each unit to its counterpart", () => {
  expect(peerUnit("mm", "imperial")).toBe("inch");
  expect(peerUnit("kg", "imperial")).toBe("lb");
  expect(peerUnit("t", "imperial")).toBe("lb");
  expect(peerUnit("rpm", "imperial")).toBe("rpm");
  expect(toSystem({ value: 3000, unit: "mm" }, "imperial")).toEqual({ value: 118.11, unit: "inch" });
  expect(toSystem({ value: 3000, unit: "mm" }, "metric")).toEqual({ value: 3000, unit: "mm" });
});

test("unit always prints; unknown units pass through untouched", () => {
  expect(formatInSystem({ value: 6000, unit: "rpm" }, "imperial")).toBe("6,000 rpm");
  expect(formatInSystem({ value: 45, unit: "kW" }, "imperial")).toBe("60.3 HP");
});
