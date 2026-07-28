import { toothArchSidePosition } from './toothLabels'

export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar'

function kindByPosition(position: number): ToothKind {
  if (position <= 2) return 'incisor'
  if (position === 3) return 'canine'
  if (position <= 5) return 'premolar'
  return 'molar'
}

/** Crown/root shape to draw for a given Universal-numbered tooth (1-32). */
export function toothKind(n: number): ToothKind {
  return kindByPosition(toothArchSidePosition(n).position)
}
