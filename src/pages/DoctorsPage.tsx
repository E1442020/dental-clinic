import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Phone, MoreVertical, Pencil, Power, PowerOff, Building2 } from 'lucide-react'
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
import {
  useDoctors,
  useCreateDoctor,
  useUpdateDoctor,
  useSetDoctorActive,
  useDoctorBranchSchedules,
  useSetDoctorBranches,
  type DoctorBranchInput,
} from '@/features/doctors/api'
import { useBranches } from '@/features/branches/api'
import { toast } from '@/hooks/use-toast'
import { weekdays } from '@/lib/weekdays'
import { cn } from '@/lib/utils'
import type { Doctor } from '@/types/database'

interface FormValues {
  full_name: string
  specialty: string
  phone: string
  email: string
}

interface BranchScheduleState {
  enabled: boolean
  days: string[]
  start: string
  end: string
}

function emptyBranchSchedule(): BranchScheduleState {
  return { enabled: false, days: [], start: '', end: '' }
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
  const setDoctorBranches = useSetDoctorBranches()
  const { data: branches } = useBranches()
  const { data: existingSchedules } = useDoctorBranchSchedules(doctor?.id)
  const [branchSchedules, setBranchSchedules] = React.useState<Record<string, BranchScheduleState>>({})
  const [branchesError, setBranchesError] = React.useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  React.useEffect(() => {
    if (open) {
      reset({
        full_name: doctor?.full_name ?? '',
        specialty: doctor?.specialty ?? '',
        phone: doctor?.phone ?? '',
        email: doctor?.email ?? '',
      })
      setBranchesError(null)

      const map: Record<string, BranchScheduleState> = {}
      for (const b of branches ?? []) map[b.id] = emptyBranchSchedule()
      for (const s of existingSchedules ?? []) {
        map[s.branch_id] = {
          enabled: true,
          days: s.working_days,
          start: s.working_hours_start?.slice(0, 5) ?? '',
          end: s.working_hours_end?.slice(0, 5) ?? '',
        }
      }
      setBranchSchedules(map)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doctor, branches, existingSchedules, reset])

  function updateBranchSchedule(branchId: string, patch: Partial<BranchScheduleState>) {
    setBranchSchedules((prev) => ({ ...prev, [branchId]: { ...(prev[branchId] ?? emptyBranchSchedule()), ...patch } }))
    setBranchesError(null)
  }

  function toggleBranchDay(branchId: string, code: string) {
    const current = branchSchedules[branchId] ?? emptyBranchSchedule()
    const days = current.days.includes(code) ? current.days.filter((d) => d !== code) : [...current.days, code]
    updateBranchSchedule(branchId, { days })
  }

  async function onSubmit(values: FormValues) {
    const enabledEntries = Object.entries(branchSchedules).filter(([, s]) => s.enabled)

    if (enabledEntries.length === 0) {
      setBranchesError('اختر فرع واحد على الأقل يعمل به الدكتور')
      return
    }
    for (const [, s] of enabledEntries) {
      if (s.days.length === 0 || !s.start || !s.end || !(s.end > s.start)) {
        setBranchesError('لكل فرع مفعّل: اختر يوم عمل واحد على الأقل ووقت دوام صحيح (النهاية بعد البداية)')
        return
      }
    }

    const branchesPayload: DoctorBranchInput[] = enabledEntries.map(([branch_id, s]) => ({
      branch_id,
      working_days: s.days,
      working_hours_start: s.start,
      working_hours_end: s.end,
    }))

    try {
      const doctorId = isEdit
        ? (await updateDoctor.mutateAsync({ id: doctor.id, ...values })).id
        : (await createDoctor.mutateAsync(values)).id

      await setDoctorBranches.mutateAsync({ doctorId, branches: branchesPayload })

      toast({ title: isEdit ? 'تم تحديث بيانات الدكتور' : 'تم إضافة الدكتور', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
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
            <Label>الفروع وموعد العمل بها *</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              حدّدي الفروع اللي الدكتور بيشتغل فيها، ولكل فرع أيام وساعات دوام مختلفة عن التانية
            </p>
            <div className="flex flex-col gap-2">
              {(branches ?? []).map((b) => {
                const schedule = branchSchedules[b.id] ?? emptyBranchSchedule()
                return (
                  <div key={b.id} className="rounded-lg border border-border p-3">
                    <button
                      type="button"
                      onClick={() => updateBranchSchedule(b.id, { enabled: !schedule.enabled })}
                      className="flex w-full items-center justify-between text-start"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <Building2 className="size-4 text-muted-foreground" />
                        {b.name}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                          schedule.enabled
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input text-muted-foreground',
                        )}
                      >
                        {schedule.enabled ? 'يعمل هنا' : 'لا يعمل هنا'}
                      </span>
                    </button>

                    {schedule.enabled && (
                      <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
                        <div className="flex flex-wrap gap-1.5">
                          {weekdays.map((d) => (
                            <button
                              key={d.code}
                              type="button"
                              onClick={() => toggleBranchDay(b.id, d.code)}
                              className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                schedule.days.includes(d.code)
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-input bg-card text-muted-foreground hover:bg-accent',
                              )}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">بداية الدوام</Label>
                            <Input
                              type="time"
                              value={schedule.start}
                              onChange={(e) => updateBranchSchedule(b.id, { start: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">نهاية الدوام</Label>
                            <Input
                              type="time"
                              value={schedule.end}
                              onChange={(e) => updateBranchSchedule(b.id, { end: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {(branches ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">لا توجد فروع بعد — أضيفي فرع أولًا من صفحة الفروع</p>
              )}
            </div>
            {branchesError && <p className="mt-1 text-xs text-destructive">{branchesError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting || setDoctorBranches.isPending}>
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
