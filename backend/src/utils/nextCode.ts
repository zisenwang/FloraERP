/**
 * Suggest the next sequential code.
 * - Starts from the most recently updated numeric code + 1 (keeps following the user's
 *   current sequence), skipping non-numeric codes.
 * - Compares numerically ("07" == 7) and skips forward past any occupied code.
 * - Returns the code zero-padded to `width`, ready for the frontend to use as-is.
 *
 * @param codesByRecency existing codes, most recently updated first
 */
export function suggestNextCode(codesByRecency: string[], width: number): string {
  const isNumeric = (c: string) => /^\d+$/.test(c)
  const numeric = codesByRecency.filter(isNumeric).map(Number)
  const occupied = new Set(numeric)

  let candidate = (numeric[0] ?? 0) + 1
  while (occupied.has(candidate)) candidate++
  return String(candidate).padStart(width, '0')
}
