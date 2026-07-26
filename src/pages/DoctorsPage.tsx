import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Phone, MoreVertical, Pencil, Power, PowerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDoctors, useCreateDoctor, useUpdateDoctor, useSetDoctorActive } from '@/features/doctors/api'
import { toast } from '@/hooks/use-toast'
import { weekdays } from '@/lib/weekdays'
import { cn } from '@/lib/utils'
import type { Doctor } from '@/types/database'

interface FormValues {
  full_name: string
  specialty: string
  phone: string
  email: string
  working_hours_start: string
  working_hours_end: string
}

function DoctorFormDialog({
  open,
  onOpenChange,
  doctor,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctor?: Doctor
}) {
  const isEdit = !!doctor
  const createDoctor = useCreateDoctor()
  const updateDoctor = useUpdateDoctor()
  const [workingDays, setWorkingDays] = React.useState<string[]>([])
  const [daysError, setDaysError] = React.useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  React.useEffect(() => {
    if (open) {
      reset({
        full_name: doctor?.full_name ?? '',
        specialty: doctor?.specialty ?? '',
        phone: doctor?.phone ?? '',
        email: doctor?.email ?? '',
        working_hours_start: doctor?.working_hours_start?.slice(0, 5) ?? '',
        working_hours_end: doctor?.working_hours_end?.slice(0, 5) ?? '',
      })
      setWorkingDays(doctor?.working_days ?? [])
      setDaysError(null)
    }
  }, [open, doctor, reset])

  function toggleDay(code: string) {
    setWorkingDays((days) => (days.includes(code) ? days.filter((d) => d !== code) : [...days, code]))
    setDaysError(null)
  }

  async function onSubmit(values: FormValues) {
    if (workingDays.length === 0) {
      setDaysError('اختر يوم عمل واحد على الأقل')
      return
    }
    const payload = { ...values, working_days: workingDays }
    try {
      if (isEdit) {
        await updateDoctor.mutateAsync({ id: doctor.id, ...payload })
        toast({ title: 'تم تحديث بيانات الدكتور', variant: 'success' })
      } else {
        await createDoctor.mutateAsync(payload)
        toast({ title: 'تم إضافة الدكتور', variant: 'success' })
      }
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل بيانات الدكتور' : 'إضافة دكتور جديد'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input id="full_name" {...register('full_name', { required: 'الاسم مطلوب' })} />
            {errors.full_name && <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="specialty">التخصص</Label>
            <Input id="specialty" {...register('specialty')} placeholder="مثال: تقويم، جراحة فم..." />
          </div>
          <div>
            <Label htmlFor="phone">الهاتف</Label>
            <Input id="phone" ltr {...register('phone')} />
          </div>
          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" ltr {...register('email')} />
          </div>

          <div>
            <Label>أيام العمل *</Label>
            <div className="flex flex-wrap gap-1.5">
              {weekdays.map((d) => (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => toggleDay(d.code)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    workingDays.includes(d.code)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-card text-muted-foreground hover:bg-accent',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {daysError && <p className="mt-1 text-xs text-destructive">{daysError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="working_hours_start">بداية الدوام *</Label>
              <Input
                id="working_hours_start"
                type="time"
                {...register('working_hours_start', { required: 'مطلوب' })}
              />
              {errors.working_hours_start && (
                <p className="mt-1 text-xs text-destructive">{errors.working_hours_start.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="working_hours_end">نهاية الدوام *</Label>
              <Input
                id="working_hours_end"
                type="time"
                {...register('working_hours_end', {
                  required: 'مطلوب',
                  validate: (value) => value > watch('working_hours_start') || 'يجب أن تكون بعد وقت البداية',
                })}
              />
              {errors.working_hours_end && (
                <p className="mt-1 text-xs text-destructive">{errors.working_hours_end.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function DoctorsPage() {
  const { data: doctors, isLoading } = useDoctors({ includeInactive: true })
  const setActive = useSetDoctorActive()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingDoctor, setEditingDoctor] = React.useState<Doctor | undefined>()
  const [confirmTarget, setConfirmTarget] = React.useState<Doctor | undefined>()

  function openCreate() {
    setEditingDoctor(undefined)
    setFormOpen(true)
  }

  function openEdit(doctor: Doctor) {
    setEditingDoctor(doctor)
    setFormOpen(true)
  }

  async function handleToggleActive() {
    if (!confirmTarget) return
    try {
      await setActive.mutateAsync({ id: confirmTarget.id, isActive: !confirmTarget.is_active })
      toast({
        title: confirmTarget.is_active ? 'تم إيقاف تفعيل الدكتور' : 'تم تفعيل الدكتور',
        variant: 'success',
      })
      setConfirmTarget(undefined)
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          إضافة دكتور
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>التخصص</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={5}>جارٍ التحميل...</TableEmpty>
            ) : doctors && doctors.length > 0 ? (
              doctors.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-semibold">{d.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.specialty ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.phone && (
                      <span className="inline-flex items-center gap-1.5" dir="ltr">
                        <Phone className="size-3.5" />
                        {d.phone}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.is_active ? 'success' : 'muted'}>
                      {d.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(d)}>
                          <Pencil className="size-4" />
                          تعديل البيانات
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive={d.is_active} onClick={() => setConfirmTarget(d)}>
                          {d.is_active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                          {d.is_active ? 'إيقاف التفعيل' : 'إعادة التفعيل'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={5}>لا يوجد أطباء بعد</TableEmpty>
            )}
          </TableBody>
        </Table>
      </Card>

      <DoctorFormDialog open={formOpen} onOpenChange={setFormOpen} doctor={editingDoctor} />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(undefined)}
        title={confirmTarget?.is_active ? 'إيقاف تفعيل الدكتور؟' : 'إعادة تفعيل الدكتور؟'}
        description={
          confirmTarget?.is_active
            ? 'الدكتور مش هيظهر عند حجز مواعيد جديدة، لكن كل بياناته وسجله القديم هيفضل محفوظ.'
            : 'الدكتور هيظهر تاني في قوائم حجز المواعيد وتسجيل العلاجات.'
        }
        confirmLabel={confirmTarget?.is_active ? 'إيقاف التفعيل' : 'تفعيل'}
        variant={confirmTarget?.is_active ? 'destructive' : 'default'}
        onConfirm={handleToggleActive}
        loading={setActive.isPending}
      />
    </div>
  )
}
