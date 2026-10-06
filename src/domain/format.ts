/**
 * Rounds half up to one decimal from the unrounded value (SPEC section 5):
 * 78.25 becomes 78.3. A small epsilon absorbs binary representation error.
 */
export function roundHalfUp1(value: number): number {
  return Math.floor(value * 10 + 0.5 + 1e-9) / 10;
}

/** Percentage with one decimal; a real zero shows as 0%, never as blank. */
export function formatScore(value: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(roundHalfUp1(value))}%`;
}
