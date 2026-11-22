/** Convert the provider's used quota without changing its limit semantics. */
export function quotaRemaining(usedPercent: number): number {
	return Math.max(0, Math.min(100, 100 - (Number.isFinite(usedPercent) ? usedPercent : 0)));
}
