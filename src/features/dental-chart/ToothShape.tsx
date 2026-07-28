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

const rootPathByKind: Record<ToothKind, string> = {
  incisor: 'M -3,0 L 3,0 L 0,13 Z',
  canine: 'M -3,0 L 3,0 L 0,17 Z',
  premolar: 'M -3,0 L 3,0 L 1.5,9 L 0,7 L -1.5,9 Z',
  molar: 'M -5,0 L -1.5,0 L -3,11 Z M 1.5,0 L 5,0 L 3,11 Z',
}

const crownPathByKind: Record<ToothKind, string> = {
  incisor: 'M -5,0 C -5,-9 -4,-13 0,-15 C 4,-13 5,-9 5,0 Z',
  canine: 'M -4.5,0 C -4.5,-6 -3,-9 0,-17 C 3,-9 4.5,-6 4.5,0 Z',
  premolar: 'M -6,0 C -6,-6 -5.5,-9 -3,-9 L -3,-12 L 0,-8 L 3,-12 L 3,-9 C 5.5,-9 6,-6 6,0 Z',
  molar: 'M -8,0 C -8,-6 -7,-9 -5,-10 L -2.5,-7 L 0,-10 L 2.5,-7 L 5,-10 C 7,-9 8,-6 8,0 Z',
}

/**
 * Stylized front-view tooth icon in the style of an anatomy chart: a root silhouette (shape,
 * length and prong-count vary by kind, like real tooth anatomy) below a crown, both colored the
 * same by clinical status so the whole tooth reads as one piece. Drawn crown-up/root-down in a
 * shared coordinate system (gumline at y=0) so every tooth lines up on the same baseline in a
 * row; the caller flips the whole icon vertically for the upper arch, where the crown hangs down
 * and the root sits up in the jaw.
 */
export function ToothIcon({ kind, status }: { kind: ToothKind; status: ToothStatus }) {
  const cls = cn('stroke-[0.9]', fillByStatus[status])
  return (
    <>
      <path d={rootPathByKind[kind]} className={cls} />
      <path d={crownPathByKind[kind]} className={cls} />
    </>
  )
}
