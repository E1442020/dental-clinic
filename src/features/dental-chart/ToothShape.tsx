import { cn } from '@/lib/utils'
import type { ToothStatus } from '@/types/database'
import type { ToothKind } from './toothGeometry'

const fillByStatus: Record<ToothStatus, string> = {
  healthy: 'fill-white stroke-slate-300',
  filled: 'fill-secondary/50 stroke-secondary',
  extracted: 'fill-muted stroke-muted-foreground/50',
  crowned: 'fill-warning/50 stroke-warning',
  needs_treatment: 'fill-destructive/40 stroke-destructive',
  root_canal: 'fill-primary/40 stroke-primary',
  implant: 'fill-success/40 stroke-success',
}

/** Facial-view outlines modeled on real tooth proportions — roots noticeably longer than crowns
 * (as in life), tapering to fine, slightly asymmetric tips rather than perfect cones:
 *  - incisors: flat-ish incisal edge on a trapezoidal crown, single long tapering root
 *  - canines: one asymmetric cusp (shorter mesial slope, longer distal slope) on the single
 *    longest root of any tooth
 *  - premolars: two low cusps (buccal/lingual) on a root that's fused near the crown and only
 *    faintly bifid at the very tip
 *  - molars: three cusps on two roots that stay fused near the crown (furcation) and clearly
 *    diverge apically, like a real multi-rooted molar */
const rootPathByKind: Record<ToothKind, string> = {
  incisor:
    'M -3,0 C -3.4,3.5 -3.1,7.5 -2,10.5 C -1.2,12.8 -0.3,14.5 0.3,15 C 0.9,14.5 1.8,12.8 2.6,10.5 C 3.7,7.5 3.4,3.5 3,0 Z',
  canine:
    'M -3,0 C -3.4,4 -3.1,9 -2,13 C -1.2,16 -0.3,17.6 0.5,18 C 1.2,17.6 2.1,16 2.9,13 C 4,9 3.7,4 3,0 Z',
  premolar:
    'M -3,0 C -3.3,3 -3,6.5 -2,9 C -1.5,10.2 -0.8,11.2 -0.5,10 C -0.2,11.3 0.2,11.3 0.5,10 C 0.8,11.2 1.5,10.2 2,9 C 3,6.5 3.3,3 3,0 Z',
  molar:
    'M -2.5,0 C -3,3 -3.5,6 -4,9 C -4.3,10.8 -4.2,12 -3.5,12.5 C -3,12.8 -2.2,11.5 -1.8,9.5 C -1.3,6.5 -1,3 -1,0 Z M 2.5,0 C 3,3 3.5,6 4,9 C 4.3,10.8 4.2,12 3.5,12.5 C 3,12.8 2.2,11.5 1.8,9.5 C 1.3,6.5 1,3 1,0 Z',
}

const crownPathByKind: Record<ToothKind, string> = {
  incisor:
    'M -4.5,0 C -4.8,-3.5 -4.6,-7 -4,-9.5 C -3.6,-11 -3,-11.8 -2.2,-12 L 2.2,-12 C 3,-11.8 3.6,-11 4,-9.5 C 4.6,-7 4.8,-3.5 4.5,0 Z',
  canine:
    'M -4.5,0 C -4.8,-3 -4.5,-5.8 -3.5,-7.8 C -2.6,-9.5 -1.3,-10.8 0,-14 C 1.3,-10.5 2.8,-8.3 3.7,-6.3 C 4.5,-4.5 4.8,-2.2 4.5,0 Z',
  premolar:
    'M -6,0 C -6.3,-3 -5.9,-5.8 -4.7,-7.5 C -4,-8.5 -3.3,-7.8 -2.8,-6.5 C -2.2,-8.5 -1.1,-9.8 0,-9.8 C 1.1,-9.8 2.2,-8.5 2.8,-6.5 C 3.3,-7.8 4,-8.5 4.7,-7.5 C 5.9,-5.8 6.3,-3 6,0 Z',
  molar:
    'M -8,0 C -8.3,-3 -7.7,-5.8 -6.4,-7.3 C -5.6,-8.2 -4.8,-7.5 -4.3,-6.2 C -3.6,-8.2 -2.3,-9.5 -1,-9.5 L 1,-9.5 C 2.3,-9.5 3.6,-8.2 4.3,-6.2 C 4.8,-7.5 5.6,-8.2 6.4,-7.3 C 7.7,-5.8 8.3,-3 8,0 Z',
}

/** How far the root canal hint (and the crown's cervical width) extends — used for both the
 * cervical line and the thin canal stroke running from the crown into the root. */
const widthByKind: Record<ToothKind, number> = { incisor: 4.5, canine: 4.5, premolar: 6, molar: 8 }
const canalDepthByKind: Record<ToothKind, number> = { incisor: 13, canine: 15, premolar: 9, molar: 9 }

/**
 * Stylized front-view (facial) tooth icon modeled on real dental anatomy: a root silhouette below
 * a crown, both colored the same by clinical status so the whole tooth reads as one piece. A
 * faint cervical line marks the crown/root boundary (like the enamel-cementum junction), and a
 * thin canal line hints at the pulp canal running down the root. Drawn crown-up/root-down in a
 * shared coordinate system (gumline at y=0) so every tooth lines up on the same baseline in a
 * row; the caller flips the whole icon vertically for the upper arch, where the crown hangs down
 * and the root sits up in the jaw.
 */
export function ToothIcon({ kind, status }: { kind: ToothKind; status: ToothStatus }) {
  const cls = cn('stroke-[0.9]', fillByStatus[status])
  const width = widthByKind[kind]
  const canalDepth = canalDepthByKind[kind]
  return (
    <>
      <path d={rootPathByKind[kind]} className={cls} />
      <path d={crownPathByKind[kind]} className={cls} />
      <path d={`M ${-width},0 L ${width},0`} className="stroke-[0.5] stroke-black/10" fill="none" />
      <path d={`M 0,-3 L 0,${canalDepth}`} className="stroke-[0.4] stroke-black/10" fill="none" />
    </>
  )
}
