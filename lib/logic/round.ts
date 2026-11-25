/**
 * Rounds a number to 0 decimal places using half-away-from-zero semantics
 * (Global Rule 3 in docs/LOGIC/README.md).
 */
export function roundHalfAwayFromZero(value: number): number {
  const rounded = value >= 0 ? Math.floor(value + 0.5) : -Math.floor(-value + 0.5);
  return rounded === 0 ? 0 : rounded;
}
