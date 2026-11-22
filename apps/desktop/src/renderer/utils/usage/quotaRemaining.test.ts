import { describe, expect, test } from "bun:test";
import { quotaRemaining } from "./quotaRemaining";

describe("remaining subscription quota", () => {
	test("starts full, decreases with usage, and ends empty", () => {
		expect([0, 5, 64, 100].map(quotaRemaining)).toEqual([100, 95, 36, 0]);
	});
	test("bounds malformed upstream values", () => {
		expect([-5, 140, Number.NaN].map(quotaRemaining)).toEqual([100, 0, 100]);
	});
});
