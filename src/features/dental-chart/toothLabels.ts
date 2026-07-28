/**
 * Universal Numbering System (1-32) is what's stored in the DB, but staff shouldn't need to
 * memorize it. Convert to arch + side + position-from-midline (1-8), e.g. "علوي يمين 6".
 * The side flips between arches (9-16 is upper-left, but 17-24 is lower-LEFT too) because the
 * numbering wraps continuously around the whole mouth rather than mirroring per arch.
 */
export function toothArchSidePosition(n: number): { arch: 'upper' | 'lower'; side: 'right' | 'left'; position: number } {
  if (n >= 1 && n <= 8) return { arch: 'upper', side: 'right', position: 9 - n }
  if (n >= 9 && n <= 16) return { arch: 'upper', side: 'left', position: n - 8 }
  if (n >= 17 && n <= 24) return { arch: 'lower', side: 'left', position: 25 - n }
  return { arch: 'lower', side: 'right', position: n - 24 }
}

const archLabels = { upper: 'علوي', lower: 'سفلي' } as const
const sideLabels = { right: 'يمين', left: 'شمال' } as const

/** Full display label, e.g. "علوي يمين 6". */
export function toothLabel(n: number): string {
  const { arch, side, position } = toothArchSidePosition(n)
  return `${archLabels[arch]} ${sideLabels[side]} ${position}`
}

const scientificNameByPosition: Record<number, string> = {
  1: 'Central Incisor',
  2: 'Lateral Incisor',
  3: 'Canine (Cuspid)',
  4: 'First Premolar',
  5: 'Second Premolar',
  6: 'First Molar',
  7: 'Second Molar',
  8: 'Third Molar',
}

/** English scientific name of the tooth, e.g. "First Molar". */
export function toothScientificName(n: number): string {
  return scientificNameByPosition[toothArchSidePosition(n).position]
}

/** All 32 teeth in Universal-number order, for building a friendly <Select>. */
export const toothOptions = Array.from({ length: 32 }, (_, i) => {
  const n = i + 1
  return { value: n, label: toothLabel(n) }
})
