import * as React from 'react'
import { ChevronRight, ChevronLeft, Plus, Clock, Stethoscope, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppointmentsByDate, useUpdateAppointmentStatus } from '@/features/appointments/api'
import { AppointmentForm } from '@/features/appointments/AppointmentForm'
import { useBranchContext } from '@/features/branches/BranchContext'
import { appointmentStatusLabels } from '@/lib/roles'
import { formatTime, formatDate, cn } from '@/lib/utils'
import type { AppointmentStatus } from '@/types/database'

const statusVariant: Record<AppointmentStatus, 'default' | 'success' | 'destructive' | 'warning'> = {
  booked: 'default',
  completed: 'success',
  cancelled: 'destructive',
  no_show: 'warning',
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function AppointmentsPage() {
  const [date, setDate] = React.useState(() => toISODate(new Date()))
  const [formOpen, setFormOpen] = React.useState(false)
  const { currentBranchId, currentBranch } = useBranchContext()
  const { data: appointments, isLoading } = useAppointmentsByDate(date, currentBranchId)
  const updateStatus = useUpdateAppointmentStatus()

  function shiftDay(delta: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(toISODate(d))
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
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}>
            <ChevronRight className="size-4" />
          </Button>
          <div className="min-w-40 text-center">
            <p className="font-semibold">{formatDate(date)}</p>
            <button className="text-xs text-primary hover:underline" onClick={() => setDate(toISODate(new Date()))}>
              اليوم
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={() => shiftDay(1)}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          حجز موعد
        </Button>
      </div>

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
                    <DropdownMenuItem
                      key={status}
                      onClick={() => updateStatus.mutate({ id: appt.id, status })}
                    >
                      {appointmentStatusLabels[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        ) : (
          <p className="p-8 text-center text-muted-foreground">لا توجد مواعيد في هذا اليوم</p>
        )}
      </Card>

      <AppointmentForm open={formOpen} onOpenChange={setFormOpen} defaultDate={date} />
    </div>
  )
}
