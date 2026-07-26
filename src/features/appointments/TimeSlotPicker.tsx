import { useDoctorAppointmentsOnDate } from './api'
import { weekdayCodeForDate, weekdays } from '@/lib/weekdays'
import { formatTime, cn } from '@/lib/utils'
import type { Doctor } from '@/types/database'

const SLOT_MINUTES = 30

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function toTimeString(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function TimeSlotPicker({
  doctor,
  date,
  value,
  onSelect,
}: {
  doctor: Doctor
  date: string
  value?: { start_time: string; end_time: string }
  onSelect: (slot: { start_time: string; end_time: string }) => void
}) {
  const { data: existingAppointments, isLoading } = useDoctorAppointmentsOnDate(doctor.id, date)

  const worksThatDay = doctor.working_days?.includes(weekdayCodeForDate(date)) ?? false

  if (!doctor.working_hours_start || !doctor.working_hours_end) {
    return (
      <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
        لم يتم تحديد ساعات عمل لهذا الدكتور. من صفحة الأطباء أضف ساعات الدوام لعرض المواعيد المتاحة تلقائيًا.
      </p>
    )
  }

  if (!worksThatDay) {
    const dayLabel = weekdays.find((d) => d.code === weekdayCodeForDate(date))?.label
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        الدكتور لا يعمل يوم {dayLabel}. اختر تاريخًا آخر أو دكتورًا آخر.
      </p>
    )
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">جارٍ تحميل المواعيد المتاحة...</p>
  }

  const startMin = toMinutes(doctor.working_hours_start.slice(0, 5))
  const endMin = toMinutes(doctor.working_hours_end.slice(0, 5))

  const busyRanges = (existingAppointments ?? []).map((a) => ({
    start: toMinutes(a.start_time.slice(0, 5)),
    end: toMinutes(a.end_time.slice(0, 5)),
  }))

  const slots: { start: number; end: number; taken: boolean }[] = []
  for (let s = startMin; s + SLOT_MINUTES <= endMin; s += SLOT_MINUTES) {
    const e = s + SLOT_MINUTES
    const taken = busyRanges.some((b) => s < b.end && e > b.start)
    slots.push({ start: s, end: e, taken })
  }

  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">لا توجد مواعيد متاحة في ساعات عمل هذا الدكتور</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((slot) => {
        const startStr = toTimeString(slot.start)
        const endStr = toTimeString(slot.end)
        const isSelected = value?.start_time === startStr
        return (
          <button
            key={startStr}
            type="button"
            disabled={slot.taken}
            onClick={() => onSelect({ start_time: startStr, end_time: endStr })}
            className={cn(
              'rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors',
              slot.taken && 'cursor-not-allowed border-border bg-muted text-muted-foreground/50 line-through',
              !slot.taken && !isSelected && 'border-input bg-card hover:bg-accent hover:text-accent-foreground',
              isSelected && 'border-primary bg-primary text-primary-foreground',
            )}
          >
            {formatTime(startStr)}
          </button>
        )
      })}
    </div>
  )
}
