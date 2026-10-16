/** Percent change from start to current, e.g. 100 → 150 is 50. */
export function calculateDelta(start: number, current: number): number | undefined {
  const delta = (current / start - 1) * 100
  return isValidDelta(delta) ? delta : undefined
}

export function isValidDelta(delta: number | null | undefined): delta is number {
  // Null-check not including zero
  return delta !== null && delta !== undefined && Number.isFinite(delta)
}
