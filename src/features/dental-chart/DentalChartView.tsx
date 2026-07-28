import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDentalChart, useSetToothStatus } from './api'
import { useTreatments } from '@/features/treatments/api'
import { TreatmentFormFields } from '@/features/treatments/TreatmentFormFields'
import { ToothIcon } from './ToothShape'
import { toothKind } from './toothGeometry'
import { toothLabel, toothScientificName } from './toothLabels'
import { toothStatusLabels } from '@/lib/roles'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { ToothStatus } from '@/types/database'

const TOOTH_VIEWBOX = '-9 -19 18 38'

// Universal Numbering System, laid out left-to-right the way patient-facing charts print it:
// upper row runs 16 -> 1, lower row continues 17 -> 32, so the two wisdom teeth on the same
// side (16/17, 1/32) sit in the same column.
const upperRow = Array.from({ length: 16 }, (_, i) => 16 - i)
const lowerRow = Array.from({ length: 16 }, (_, i) => 17 + i)

function ToothRow({
  teeth,
  statusByTooth,
  onSelect,
  label,
  flip,
}: {
  teeth: number[]
  statusByTooth: Map<number, ToothStatus>
  onSelect: (n: number) => void
  label: string
  /** Upper arch: the crown hangs down and the root sits up in the jaw, so the icon is flipped. */
  flip?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div dir="ltr" className="grid w-full grid-cols-16 justify-items-center gap-0.5 sm:gap-1">
        {teeth.map((n) => {
          const status = statusByTooth.get(n) ?? 'healthy'
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              title={`${toothScientificName(n)} — ${toothLabel(n)}`}
              className="group flex w-full flex-col items-center gap-0.5 rounded-md p-0.5 transition-colors hover:bg-primary/10"
            >
              <svg viewBox={TOOTH_VIEWBOX} className="h-auto w-full max-w-14">
                <g transform={flip ? 'scale(1,-1)' : undefined}>
                  <ToothIcon kind={toothKind(n)} status={status} />
                </g>
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DentalChartView({ patientId }: { patientId: string }) {
  const { data: chart } = useDentalChart(patientId)
  const [openTooth, setOpenTooth] = React.useState<number | null>(null)

  const statusByTooth = React.useMemo(() => {
    const map = new Map<number, ToothStatus>()
    chart?.forEach((row) => map.set(row.tooth_number, row.current_status))
    return map
  }, [chart])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
        {Object.entries(toothStatusLabels).map(([value, label]) => (
          <span key={value} className="inline-flex items-center gap-1.5">
            <svg viewBox={TOOTH_VIEWBOX} className="h-7 w-4">
              <ToothIcon kind="premolar" status={value as ToothStatus} />
            </svg>
            {label}
          </span>
        ))}
      </div>

      <div className="flex w-full flex-col gap-6">
        <ToothRow teeth={upperRow} statusByTooth={statusByTooth} onSelect={setOpenTooth} label="الفك العلوي" flip />
        <ToothRow teeth={lowerRow} statusByTooth={statusByTooth} onSelect={setOpenTooth} label="الفك السفلي" />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        دوس على أي سنة لتعديل حالتها أو تسجيل علاج · مرر الماوس فوقها لمعرفة اسمها العلمي بالإنجليزي
      </p>

      {openTooth !== null && (
        <ToothDialog patientId={patientId} tooth={openTooth} onOpenChange={(open) => !open && setOpenTooth(null)} />
      )}
    </div>
  )
}

function ToothDialog({
  patientId,
  tooth,
  onOpenChange,
}: {
  patientId: string
  tooth: number
  onOpenChange: (open: boolean) => void
}) {
  const { data: chart } = useDentalChart(patientId)
  const { data: treatments } = useTreatments(patientId)
  const setStatus = useSetToothStatus()

  const entry = chart?.find((row) => row.tooth_number === tooth)
  const status = entry?.current_status ?? 'healthy'
  const toothTreatments = treatments?.filter((t) => t.tooth_number === tooth) ?? []

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            سن {toothLabel(tooth)}{' '}
            <span className="font-normal text-muted-foreground">({toothScientificName(tooth)})</span>
          </DialogTitle>
          {entry && <DialogDescription>آخر تحديث {formatDate(entry.last_updated)}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/90">حالة السنة</label>
            <Select
              value={status}
              onValueChange={(v) => setStatus.mutate({ patientId, toothNumber: tooth, status: v as ToothStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(toothStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {toothTreatments.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground/90">سجل العلاجات لهذه السنة</p>
              <div className="flex flex-col gap-1.5 rounded-md border border-border p-2">
                {toothTreatments.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span>
                      {t.procedure_type} · {formatDate(t.procedure_date)}
                    </span>
                    <span className="font-semibold">{formatCurrency(Number(t.cost))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-3 text-sm font-bold">تسجيل علاج جديد لهذه السنة</p>
            <TreatmentFormFields
              patientId={patientId}
              defaultTooth={tooth}
              onSaved={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
