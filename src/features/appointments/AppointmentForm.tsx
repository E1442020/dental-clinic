import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, X, UserPlus, Building2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateAppointment } from './api'
import { TimeSlotPicker } from './TimeSlotPicker'
import { usePatients, useCreatePatient } from '@/features/patients/api'
import { useDoctors } from '@/features/doctors/api'
import { useBranchContext } from '@/features/branches/BranchContext'
import { toast } from '@/hooks/use-toast'
import type { Patient } from '@/types/database'

const schema = z
  .object({
    doctor_id: z.string().min(1, 'اختر الدكتور'),
    appointment_date: z.string().min(1, 'اختر التاريخ'),
    start_time: z.string().min(1, 'اختر وقت البداية'),
    end_time: z.string().min(1, 'اختر وقت النهاية'),
    reason: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    new_patient_name: z.string().optional().or(z.literal('')),
    new_patient_phone: z.string().optional().or(z.literal('')),
  })
  .refine((v) => v.end_time > v.start_time, {
    message: 'وقت النهاية يجب أن يكون بعد وقت البداية',
    path: ['end_time'],
  })

type FormValues = z.infer<typeof schema>

export function AppointmentForm({
  open,
  onOpenChange,
  defaultDate,
  presetPatient,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: string
  presetPatient?: Patient
}) {
  const [patientMode, setPatientMode] = React.useState<'existing' | 'new'>('existing')
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | undefined>(presetPatient)
  const [patientSearch, setPatientSearch] = React.useState('')
  const { data: doctors } = useDoctors()
  const { data: patientResults } = usePatients(patientSearch)
  const { currentBranchId, currentBranch } = useBranchContext()
  const createAppointment = useCreateAppointment()
  const createPatient = useCreatePatient()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { appointment_date: defaultDate ?? new Date().toISOString().slice(0, 10) },
  })

  const selectedDoctor = doctors?.find((d) => d.id === watch('doctor_id'))

  React.useEffect(() => {
    if (open) {
      setSelectedPatient(presetPatient)
      setPatientMode('existing')
      setPatientSearch('')
      reset({
        doctor_id: '',
        appointment_date: defaultDate ?? new Date().toISOString().slice(0, 10),
        start_time: '',
        end_time: '',
        reason: '',
        notes: '',
        new_patient_name: '',
        new_patient_phone: '',
      })
    }
  }, [open, presetPatient, defaultDate, reset])

  async function onSubmit(values: FormValues) {
    if (!currentBranchId) {
      toast({ title: 'لازم تضيف فرع أولًا من صفحة الفروع', variant: 'destructive' })
      return
    }

    let patientId = selectedPatient?.id

    if (patientMode === 'new') {
      if (!values.new_patient_name || !values.new_patient_phone) {
        toast({ title: 'أدخل اسم ورقم هاتف المريض الجديد', variant: 'destructive' })
        return
      }
      try {
        const newPatient = await createPatient.mutateAsync({
          full_name: values.new_patient_name,
          phone: values.new_patient_phone,
          primary_branch_id: currentBranchId,
        })
        patientId = newPatient.id
      } catch (err) {
        toast({ title: 'تعذّر إضافة المريض', description: (err as Error).message, variant: 'destructive' })
        return
      }
    }

    if (!patientId) {
      toast({ title: 'اختر المريض أولًا', variant: 'destructive' })
      return
    }

    try {
      await createAppointment.mutateAsync({
        patient_id: patientId,
        doctor_id: values.doctor_id,
        branch_id: currentBranchId,
        appointment_date: values.appointment_date,
        start_time: values.start_time,
        end_time: values.end_time,
        reason: values.reason || null,
        notes: values.notes || null,
      })
      toast({ title: 'تم حجز الموعد بنجاح', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'تعذّر حجز الموعد', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>حجز موعد جديد</DialogTitle>
          <DialogDescription>النظام يمنع تعارض المواعيد تلقائيًا لنفس الدكتور</DialogDescription>
        </DialogHeader>

        {currentBranch && (
          <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            <Building2 className="size-3.5" />
            الحجز في فرع: {currentBranch.name}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">المريض</Label>
              {!presetPatient && !selectedPatient && (
                <button
                  type="button"
                  onClick={() => setPatientMode((m) => (m === 'existing' ? 'new' : 'existing'))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {patientMode === 'existing' ? (
                    <>
                      <UserPlus className="size-3.5" />
                      مريض جديد
                    </>
                  ) : (
                    <>
                      <Search className="size-3.5" />
                      مريض مسجل
                    </>
                  )}
                </button>
              )}
            </div>

            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-md border border-input bg-accent/40 px-3 py-2 text-sm">
                <span className="font-semibold">{selectedPatient.full_name}</span>
                {!presetPatient && (
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(undefined)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ) : patientMode === 'new' ? (
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="اسم المريض" {...register('new_patient_name')} />
                <Input placeholder="رقم الهاتف" ltr {...register('new_patient_phone')} />
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو الهاتف..."
                  className="ps-9"
                />
                {patientSearch && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                    {patientResults && patientResults.length > 0 ? (
                      patientResults.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p)
                            setPatientSearch('')
                          }}
                          className="flex w-full flex-col items-start px-3 py-2 text-start text-sm hover:bg-accent"
                        >
                          <span className="font-medium">{p.full_name}</span>
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {p.phone}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-muted-foreground">لا يوجد نتائج</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>الدكتور</Label>
              <Select
                value={watch('doctor_id')}
                onValueChange={(v) => {
                  setValue('doctor_id', v)
                  setValue('start_time', '')
                  setValue('end_time', '')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الدكتور" />
                </SelectTrigger>
                <SelectContent>
                  {doctors?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.doctor_id && <p className="mt-1 text-xs text-destructive">{errors.doctor_id.message}</p>}
            </div>
            <div>
              <Label htmlFor="appointment_date">التاريخ</Label>
              <Input
                id="appointment_date"
                type="date"
                {...register('appointment_date', {
                  onChange: () => {
                    setValue('start_time', '')
                    setValue('end_time', '')
                  },
                })}
              />
            </div>
          </div>

          <div>
            <Label>الوقت المتاح</Label>
            {selectedDoctor && watch('appointment_date') ? (
              <TimeSlotPicker
                doctor={selectedDoctor}
                date={watch('appointment_date')}
                value={
                  watch('start_time') ? { start_time: watch('start_time'), end_time: watch('end_time') } : undefined
                }
                onSelect={(slot) => {
                  setValue('start_time', slot.start_time)
                  setValue('end_time', slot.end_time)
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">اختر الدكتور والتاريخ أولًا لعرض المواعيد المتاحة</p>
            )}
            {errors.end_time && <p className="mt-1 text-xs text-destructive">{errors.end_time.message}</p>}
          </div>

          <div>
            <Label htmlFor="reason">سبب الزيارة</Label>
            <Input id="reason" {...register('reason')} placeholder="مثال: كشف، ألم ضرس..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جارٍ الحجز...' : 'تأكيد الحجز'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
