export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar'

/** 16 teeth per arch, symmetric from the two central incisors (index 7,8) outward to the wisdom teeth (0,15). */
export function toothKind(indexInArch: number): ToothKind {
  const d = indexInArch <= 7 ? 7 - indexInArch : indexInArch - 8
  if (d <= 1) return 'incisor'
  if (d === 2) return 'canine'
  if (d <= 4) return 'premolar'
  return 'molar'
}

/** angleDeg: 0 = straight up (12 o'clock), clockwise positive — matches SVG rotate() directly. */
export function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export interface ArchToothLayout {
  x: number
  y: number
  rotate: number
  kind: ToothKind
}

/**
 * Lays 16 teeth around a horseshoe, following the Universal Numbering System (1-32) convention:
 * charts are drawn "facing the patient", so the patient's right side appears on the viewer's left.
 * `frontAngle` is where the central incisors sit (180 = bottom, for an upper arch drawn with its
 * front teeth at the bottom of the panel; 0 = top, for a lower arch drawn front-teeth-up).
 */
export function archLayout(cx: number, cy: number, radius: number, frontAngle: number, halfSpan = 150): ArchToothLayout[] {
  return Array.from({ length: 16 }, (_, i) => {
    const t = i / 15
    const angle = frontAngle + halfSpan - t * (2 * halfSpan)
    const { x, y } = polarPoint(cx, cy, radius, angle)
    return { x, y, rotate: angle, kind: toothKind(i) }
  })
}

/** SVG path for an open horseshoe band (annulus sector) — a real jaw outline, not a closed circle. */
export function archBandPath(cx: number, cy: number, rOuter: number, rInner: number, frontAngle: number, halfSpan: number) {
  const a1 = frontAngle - halfSpan
  const a2 = frontAngle + halfSpan
  const largeArc = a2 - a1 > 180 ? 1 : 0
  const outerStart = polarPoint(cx, cy, rOuter, a1)
  const outerEnd = polarPoint(cx, cy, rOuter, a2)
  const innerEnd = polarPoint(cx, cy, rInner, a2)
  const innerStart = polarPoint(cx, cy, rInner, a1)
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}
