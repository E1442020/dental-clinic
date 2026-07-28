import * as React from 'react'
import { Plus, Clock, Stethoscope, Building2, MessageCircle, Check, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useAppointmentsByDate,
  useAppointmentsByDateRange,
  useUpdateAppointmentStatus,
  useMarkReminderSent,
  useDoctorsForBranch,
  type AppointmentWithRelations,
} from '@/features/appointments/api'
import { AppointmentForm } from '@/features/appointments/AppointmentForm'
import { DateStrip } from '@/features/appointments/DateStrip'
import { useBranchContext } from '@/features/branches/BranchContext'
import { useClinicSettings } from '@/features/clinic-settings/api'
import { appointmentStatusLabels } from '@/lib/roles'
import { weekdays, weekdayCodeForDate } from '@/lib/weekdays'
import { formatTime, whatsAppLink, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { AppointmentStatus } from '@/types/database'

type ViewMode = 'day' | 'week' | 'month'

const viewLabels: Record<ViewMode, string> = { day: 'يوم', week: 'أسبوع', month: 'شهر' }

const statusVariant: Record<AppointmentStatus, 'default' | 'success' | 'destructive' | 'warning'> = {
  booked: 'default',
  completed: 'success',
  cancelled: 'destructive',
  no_show: 'warning',
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function addDaysIso(iso: string, delta: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

function addMonthsIso(iso: string, delta: number) {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + delta)
  return toISODate(d)
}

function startOfWeekIso(iso: string) {
  const d = new Date(iso)
  d.setDate(d.getDate() - d.getDay())
  return toISODate(d)
}

function startOfMonthIso(iso: string) {
  const d = new Date(iso)
  d.setDate(1)
  return toISODate(d)
}

function endOfMonthIso(iso: string) {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + 1, 0)
  return toISODate(d)
}

function formatFullDayLabel(date: string) {
  return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date))
}

function formatDayMonth(date: string) {
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(new Date(date))
}

function formatMonthYear(date: string) {
  return new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(new Date(date))
}

function ReminderButton({
  appointment,
  branchName,
}: {
  appointment: AppointmentWithRelations
  branchName?: string
}) {
  const markReminderSent = useMarkReminderSent()
  const { data: clinicSettings } = useClinicSettings()
  const patient = appointment.patients
  if (!patient) return null

  async function handleClick() {
    const doctorName = appointment.doctors?.full_name
    const doctorPart = doctorName ? ` مع د. ${doctorName}` : ''
    const branchPart = branchName ? ` في ${branchName}` : ''
    const signature = clinicSettings?.name ? `\n\nعيادة ${clinicSettings.name}` : ''
    const contactLine = clinicSettings?.whatsapp_number ? `\nللتواصل: ${clinicSettings.whatsapp_number}` : ''
    const message = `مرحبًا ${patient.full_name}، تذكير بموعدك${branchPart} يوم ${formatFullDayLabel(appointment.appointment_date)} الساعة ${formatTime(appointment.start_time)}${doctorPart}.${signature}${contactLine}`

    if (!appointment.reminder_sent) {
      try {
        await markReminderSent.mutateAsync(appointment.id)
      } catch {
        // لو فشل التحديث، برضو نفتح واتساب — الموظف لسه محتاج يبعت الرسالة
      }
    }
    toast({ title: 'واتساب هيفتح دلوقتي — دوس إرسال جوه المحادثة' })
    // تأخيرة بسيطة عشان يبان التنبيه قبل ما الصفحة تتنقل؛ نفس الصفحة (مش تاب جديد) عشان التجربة تبقى أسرع
    window.setTimeout(() => {
      window.location.href = whatsAppLink(patient.phone, message)
    }, 400)
  }

  return (
    <Button size="sm" variant={appointment.reminder_sent ? 'ghost' : 'outline'} onClick={handleClick}>
      {appointment.reminder_sent ? <Check className="size-4 text-success" /> : <MessageCircle className="size-4" />}
      {appointment.reminder_sent ? 'تم إرسال التذكير' : 'تذكير واتساب'}
    </Button>
  )
}

function DayView({
  date,
  branchId,
  doctorId,
  branchName,
}: {
  date: string
  branchId?: string
  doctorId?: string
  branchName?: string
}) {
  const { data: appointments, isLoading } = useAppointmentsByDate(date, branchId, doctorId)
  const updateStatus = useUpdateAppointmentStatus()

  return (
    <Card className="divide-y divide-border">
      {isLoading ? (
        <p className="p-8 text-center text-muted-foreground">جارٍ التحميل...</p>
      ) : appointments && appointments.length > 0 ? (
        appointments.map((appt) => (
          <div key={appt.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex min-w-20 flex-col items-center rounded-lg bg-accent px-3 py-2 text-accent-foreground">
                <Clock className="size-3.5" />
                <span className="text-xs font-semibold">{formatTime(appt.start_time)}</span>
              </div>
              <div>
                <p className="font-semibold">{appt.patients?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  <span dir="ltr">{appt.patients?.phone}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Stethoscope className="size-3.5" />
                    {appt.doctors?.full_name}
                  </span>
                  {appt.reason && <span>· {appt.reason}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ReminderButton appointment={appt} branchName={branchName} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button>
                    <Badge variant={statusVariant[appt.status]} className={cn('cursor-pointer')}>
                      {appointmentStatusLabels[appt.status]}
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(['booked', 'completed', 'cancelled', 'no_show'] as AppointmentStatus[]).map((status) => (
                    <DropdownMenuItem key={status} onClick={() => updateStatus.mutate({ id: appt.id, status })}>
                      {appointmentStatusLabels[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))
      ) : (
        <p className="p-8 text-center text-muted-foreground">لا توجد مواعيد في هذا اليوم</p>
      )}
    </Card>
  )
}

function WeekView({
  date,
  branchId,
  doctorId,
  onSelectDay,
}: {
  date: string
  branchId?: string
  doctorId?: string
  onSelectDay: (date: string) => void
}) {
  const weekStart = startOfWeekIso(date)
  const weekEnd = addDaysIso(weekStart, 6)
  const todayIso = React.useMemo(() => toISODate(new Date()), [])
  const { data: appointments, isLoading } = useAppointmentsByDateRange(weekStart, weekEnd, branchId, doctorId)
  const days = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i)), [weekStart])

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((d) => {
        const dayAppointments = appointments?.filter((a) => a.appointment_date === d) ?? []
        return (
          <Card key={d} className={cn('flex flex-col overflow-hidden', d === todayIso && 'ring-2 ring-primary')}>
            <button
              type="button"
              onClick={() => onSelectDay(d)}
              className="border-b border-border p-2 text-center transition-colors hover:bg-accent"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                {weekdays.find((w) => w.code === weekdayCodeForDate(d))?.label}
              </p>
              <p className="text-sm font-bold">{new Date(d).getDate()}</p>
            </button>
            <div className="flex min-h-16 flex-col gap-1 p-2">
              {isLoading ? (
                <p className="text-center text-[11px] text-muted-foreground">...</p>
              ) : dayAppointments.length > 0 ? (
                dayAppointments.map((a) => (
                  <div key={a.id} className="rounded-md bg-accent px-2 py-1 text-[11px]">
                    <p className="font-semibold">{formatTime(a.start_time)}</p>
                    <p className="truncate text-muted-foreground">{a.patients?.full_name}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-[11px] text-muted-foreground">لا مواعيد</p>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function MonthView({
  date,
  branchId,
  doctorId,
  onSelectDay,
}: {
  date: string
  branchId?: string
  doctorId?: string
  onSelectDay: (date: string) => void
}) {
  const monthStart = startOfMonthIso(date)
  const monthEnd = endOfMonthIso(date)
  const todayIso = React.useMemo(() => toISODate(new Date()), [])
  const { data: appointments, isLoading } = useAppointmentsByDateRange(monthStart, monthEnd, branchId, doctorId)

  const countByDay = React.useMemo(() => {
    const map = new Map<string, number>()
    appointments?.forEach((a) => map.set(a.appointment_date, (map.get(a.appointment_date) ?? 0) + 1))
    return map
  }, [appointments])

  const daysInMonth = new Date(monthEnd).getDate()
  const leadingBlanks = new Date(monthStart).getDay()
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDaysIso(monthStart, i)),
  ]

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
        {weekdays.map((w) => (
          <div key={w.code}>{w.label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDay(d)}
              className={cn(
                'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-border transition-colors hover:bg-accent',
                d === todayIso && 'ring-2 ring-primary',
              )}
            >
              <span className="text-sm font-bold">{new Date(d).getDate()}</span>
              {!isLoading && (countByDay.get(d) ?? 0) > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {countByDay.get(d)}
                </Badge>
              )}
            </button>
          ) : (
            <div key={`empty-${i}`} />
          ),
        )}
      </div>
    </div>
  )
}

export default function AppointmentsPage() {
  const [date, setDate] = React.useState(() => toISODate(new Date()))
  const [viewMode, setViewMode] = React.useState<ViewMode>('day')
  const [doctorId, setDoctorId] = React.useState<string>('all')
  const [formOpen, setFormOpen] = React.useState(false)
  const { currentBranchId, currentBranch } = useBranchContext()
  const { data: doctors } = useDoctorsForBranch(currentBranchId)
  const isToday = date === toISODate(new Date())
  const effectiveDoctorId = doctorId === 'all' ? undefined : doctorId

  function goToToday() {
    setDate(toISODate(new Date()))
  }

  return (
    <div className="flex flex-col gap-4">
      {currentBranch && (
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <Building2 className="size-3.5" />
          مواعيد {currentBranch.name}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
            <Button key={v} size="sm" variant={viewMode === v ? 'default' : 'outline'} onClick={() => setViewMode(v)}>
              {viewLabels[v]}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الدكاترة</SelectItem>
              {doctors?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            حجز موعد
          </Button>
        </div>
      </div>

      {viewMode === 'day' && (
        <>
          <div className="flex flex-col gap-2">
            <p className="font-semibold">
              {isToday ? 'اليوم ' : ''}
              {formatFullDayLabel(date)}
              {!isToday && (
                <button className="ms-2 text-xs font-normal text-primary hover:underline" onClick={goToToday}>
                  الرجوع لليوم
                </button>
              )}
            </p>
            <DateStrip date={date} onChange={setDate} />
          </div>
          <DayView date={date} branchId={currentBranchId} doctorId={effectiveDoctorId} branchName={currentBranch?.name} />
        </>
      )}

      {viewMode === 'week' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">
              أسبوع {formatDayMonth(startOfWeekIso(date))} — {formatDayMonth(addDaysIso(startOfWeekIso(date), 6))}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                هذا الأسبوع
              </Button>
              <Button variant="outline" size="icon" onClick={() => setDate((d) => addDaysIso(d, -7))}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setDate((d) => addDaysIso(d, 7))}>
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          </div>
          <WeekView
            date={date}
            branchId={currentBranchId}
            doctorId={effectiveDoctorId}
            onSelectDay={(d) => {
              setDate(d)
              setViewMode('day')
            }}
          />
        </>
      )}

      {viewMode === 'month' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{formatMonthYear(date)}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                الشهر الحالي
              </Button>
              <Button variant="outline" size="icon" onClick={() => setDate((d) => addMonthsIso(d, -1))}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setDate((d) => addMonthsIso(d, 1))}>
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          </div>
          <MonthView
            date={date}
            branchId={currentBranchId}
            doctorId={effectiveDoctorId}
            onSelectDay={(d) => {
              setDate(d)
              setViewMode('day')
            }}
          />
        </>
      )}

      <AppointmentForm open={formOpen} onOpenChange={setFormOpen} defaultDate={date} />
    </div>
  )
}
