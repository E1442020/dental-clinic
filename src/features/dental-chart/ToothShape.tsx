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

/**
 * Local-coordinate crown outline per tooth type, drawn so the tip (outward, away from the
 * arch center) points toward negative-y and the gum-line (inward) sits near positive-y.
 * Caller positions/rotates via a wrapping <g transform>.
 */
export function ToothCrown({ kind, status }: { kind: ToothKind; status: ToothStatus }) {
  const cls = cn('stroke-[1.1]', fillByStatus[status])

  switch (kind) {
    case 'incisor':
      return <rect x={-5.5} y={-15} width={11} height={24} rx={3.5} className={cls} />
    case 'canine':
      return (
        <path
          d="M -6.5,10 C -7.5,0 -6,-8 0,-18 C 6,-8 7.5,0 6.5,10 C 6.5,13.5 -6.5,13.5 -6.5,10 Z"
          className={cls}
        />
      )
    case 'premolar':
      return <rect x={-7} y={-14} width={14} height={25} rx={7} className={cls} />
    case 'molar':
      return <rect x={-9} y={-13} width={18} height={24} rx={5.5} className={cls} />
  }
}

export function toothRadialOffset(kind: ToothKind) {
  return kind === 'incisor' ? -15 : kind === 'canine' ? -18 : kind === 'premolar' ? -14 : -13
}
