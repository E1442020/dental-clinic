import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDentalChart, useSetToothStatus } from './api'
import { useTreatments } from '@/features/treatments/api'
import { TreatmentFormFields } from '@/features/treatments/TreatmentFormFields'
import { ToothCrown, toothRadialOffset } from './ToothShape'
import { archLayout, archBandPath } from './toothGeometry'
import { toothStatusLabels } from '@/lib/roles'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { ToothStatus } from '@/types/database'

const VIEW_W = 300
const VIEW_H = 200
const CENTER_X = VIEW_W / 2
const CENTER_Y = VIEW_H / 2
const RADIUS = 66
const HALF_SPAN = 150

const upperLayout = archLayout(CENTER_X, CENTER_Y, RADIUS, 180, HALF_SPAN)
const lowerLayout = archLayout(CENTER_X, CENTER_Y, RADIUS, 0, HALF_SPAN)
const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1)
const lowerTeeth = Array.from({ length: 16 }, (_, i) => i + 17)

function ArchSvg({
  teeth,
  layout,
  frontAngle,
  statusByTooth,
  onSelect,
  label,
}: {
  teeth: number[]
  layout: ReturnType<typeof archLayout>
  frontAngle: number
  statusByTooth: Map<number, ToothStatus>
  onSelect: (n: number) => void
  label: string
}) {
  const bandPath = archBandPath(CENTER_X, CENTER_Y, RADIUS + 20, RADIUS - 20, frontAngle, HALF_SPAN + 6)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full max-w-sm">
        <path d={bandPath} strokeLinejoin="round" className="fill-rose-100 stroke-rose-200 dark:fill-rose-950/30 dark:stroke-rose-900/40" />
        {teeth.map((n, i) => {
          const pos = layout[i]
          const status = statusByTooth.get(n) ?? 'healthy'
          const numberOffset = toothRadialOffset(pos.kind) - 6
          return (
            <g key={n} onClick={() => onSelect(n)} className="group cursor-pointer">
              <circle
                cx={pos.x}
                cy={pos.y}
                r={13}
                className="fill-transparent transition-colors group-hover:fill-primary/15"
              />
              <g transform={`translate(${pos.x} ${pos.y}) rotate(${pos.rotate})`}>
                <ToothCrown kind={pos.kind} status={status} />
                <g transform={`rotate(${-pos.rotate})`}>
                  <text
                    x={0}
                    y={numberOffset}
                    textAnchor="middle"
                    className="fill-slate-500 text-[7px] font-bold dark:fill-slate-400"
                  >
                    {n}
                  </text>
                </g>
              </g>
            </g>
          )
        })}
      </svg>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
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
            <svg viewBox="-9 -18 18 32" className="size-4">
              <ToothCrown kind="premolar" status={value as ToothStatus} />
            </svg>
            {label}
          </span>
        ))}
      </div>

      <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-4">
        <ArchSvg
          teeth={upperTeeth}
          layout={upperLayout}
          frontAngle={180}
          statusByTooth={statusByTooth}
          onSelect={setOpenTooth}
          label="الفك العلوي"
        />
        <ArchSvg
          teeth={lowerTeeth}
          layout={lowerLayout}
          frontAngle={0}
          statusByTooth={statusByTooth}
          onSelect={setOpenTooth}
          label="الفك السفلي"
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        دوس على أي سنة لتعديل حالتها أو تسجيل علاج · الترقيم حسب النظام العالمي (Universal 1-32) والرسمة كأنك واقف قدام المريض
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
          <DialogTitle>السنة رقم {tooth}</DialogTitle>
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
