import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Plus, MoreVertical, Pencil, Power, PowerOff, RefreshCw, Copy, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useStaff,
  useUpdateStaff,
  useCreateStaffUser,
  useSetUserBranches,
  useResetStaffPassword,
  generateTempPassword,
  type StaffMember,
} from '@/features/staff/api'
import { useBranches, useUserBranchIds } from '@/features/branches/api'
import { useDoctors } from '@/features/doctors/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { roleLabels } from '@/lib/roles'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

const roleOptions: UserRole[] = ['admin', 'doctor', 'receptionist', 'accountant']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** admin/accountant see every branch regardless (see BranchContext), so they don't need — and
 * can't be limited to — a specific set here. */
const BRANCH_SCOPED_ROLES: UserRole[] = ['doctor', 'receptionist']

function staffBranchLabel(s: StaffMember) {
  const names = s.user_branches.map((ub) => ub.branch?.name).filter((name): name is string => !!name)
  return names.length > 0 ? names.join('، ') : 'كل الفروع'
}

function BranchCheckboxList({
  branches,
  selected,
  onChange,
}: {
  branches: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <div className="flex max-h-36 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-2">
      {branches.length === 0 && <p className="text-xs text-muted-foreground">مفيش فروع مسجّلة بعد</p>}
      {branches.map((b) => (
        <label key={b.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(b.id)}
            onChange={() => toggle(b.id)}
            className="size-4 rounded border-input accent-primary"
          />
          {b.name}
        </label>
      ))}
    </div>
  )
}

function CreateStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createStaffUser = useCreateStaffUser()
  const { data: branches } = useBranches()
  const { data: doctors } = useDoctors()
  const [branchIds, setBranchIds] = React.useState<string[]>([])
  const [branchError, setBranchError] = React.useState<string | null>(null)

  interface FormValues {
    full_name: string
    email: string
    password: string
    role: UserRole
    linked_doctor_id: string
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { role: 'receptionist', linked_doctor_id: 'none' } })

  const role = watch('role')
  const isBranchScoped = BRANCH_SCOPED_ROLES.includes(role)

  React.useEffect(() => {
    if (open) {
      reset({ password: generateTempPassword(), role: 'receptionist', linked_doctor_id: 'none' })
      setBranchIds([])
      setBranchError(null)
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    if (isBranchScoped && branchIds.length === 0) {
      setBranchError('لازم تحددي فرع واحد على الأقل — من غيره مش هيقدر يشوف مواعيد أو فواتير أي فرع')
      return
    }
    setBranchError(null)
    try {
      await createStaffUser.mutateAsync({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        role: values.role,
        branch_ids: isBranchScoped ? branchIds : [],
        linked_doctor_id: values.role === 'doctor' && values.linked_doctor_id !== 'none' ? values.linked_doctor_id : null,
      })
      toast({
        title: 'تم إنشاء الحساب بنجاح',
        description: `شارك بيانات الدخول دي مع الموظف: ${values.email} / ${values.password}`,
        variant: 'success',
      })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'تعذّر إنشاء الحساب', description: (err as Error).message, variant: 'destructive' })
    }
  }

  function copyPassword() {
    navigator.clipboard.writeText(watch('password'))
    toast({ title: 'تم نسخ كلمة المرور' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة موظف جديد</DialogTitle>
          <DialogDescription>هيتم إنشاء حساب دخول حقيقي للموظف فورًا — شاركي بيانات الدخول معاه بعد الحفظ</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input id="full_name" {...register('full_name', { required: 'الاسم مطلوب' })} />
            {errors.full_name && <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              ltr
              {...register('email', {
                required: 'البريد الإلكتروني مطلوب',
                pattern: { value: EMAIL_PATTERN, message: 'أدخلي بريدًا إلكترونيًا حقيقيًا وصحيحًا' },
              })}
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">كلمة المرور المبدئية</Label>
            <div className="flex items-center gap-2">
              <Input id="password" ltr {...register('password', { required: true, minLength: 6 })} />
              <Button type="button" variant="outline" size="icon" onClick={() => setValue('password', generateTempPassword())}>
                <RefreshCw className="size-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">الموظف يقدر يغيّرها بعدين من صفحة الملف الشخصي</p>
          </div>
          <div>
            <Label>الدور</Label>
            <Select value={role} onValueChange={(v) => setValue('role', v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الفروع</Label>
            {isBranchScoped ? (
              <>
                <BranchCheckboxList
                  branches={branches ?? []}
                  selected={branchIds}
                  onChange={(ids) => {
                    setBranchIds(ids)
                    if (ids.length > 0) setBranchError(null)
                  }}
                />
                {branchError && <p className="mt-1 text-xs text-destructive">{branchError}</p>}
                {!branchError && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    تقدري تحددي أكتر من فرع لو الموظف بيشتغل في أكتر من مكان
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
                الدور ده بيشوف بيانات كل الفروع تلقائيًا، مش محتاج تحديد فرع
              </p>
            )}
          </div>
          {role === 'doctor' && (
            <div>
              <Label>مرتبط بسجل الدكتور</Label>
              <Select value={watch('linked_doctor_id')} onValueChange={(v) => setValue('linked_doctor_id', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون ربط</SelectItem>
                  {doctors?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                عشان الحساب يشوف مواعيده بس، لازم يترتبط بسجل الدكتور المطابق في صفحة "الأطباء"
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditStaffDialog({
  open,
  onOpenChange,
  staff,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff?: StaffMember
}) {
  const updateStaff = useUpdateStaff()
  const setUserBranches = useSetUserBranches()
  const { data: branches } = useBranches()
  const { data: doctors } = useDoctors()
  const { data: assignedBranchIds } = useUserBranchIds(staff?.id)
  const [branchIds, setBranchIds] = React.useState<string[]>([])
  const [branchError, setBranchError] = React.useState<string | null>(null)

  interface FormValues {
    full_name: string
    role: UserRole
    linked_doctor_id: string
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  React.useEffect(() => {
    if (open && staff) {
      setValue('full_name', staff.full_name)
      setValue('role', staff.role)
      setValue('linked_doctor_id', staff.linked_doctor_id ?? 'none')
      setBranchIds(assignedBranchIds ?? [])
      setBranchError(null)
    }
    // assignedBranchIds arrives asynchronously after `open` flips true, so it needs to be in the
    // dependency list too — not just a one-time reset keyed on `open`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, staff, assignedBranchIds, setValue])

  async function onSubmit(values: FormValues) {
    if (!staff) return
    const isBranchScoped = BRANCH_SCOPED_ROLES.includes(values.role)
    if (isBranchScoped && branchIds.length === 0) {
      setBranchError('لازم تحددي فرع واحد على الأقل — من غيره مش هيقدر يشوف مواعيد أو فواتير أي فرع')
      return
    }
    setBranchError(null)
    try {
      await setUserBranches.mutateAsync({ userId: staff.id, branchIds: isBranchScoped ? branchIds : [] })
      await updateStaff.mutateAsync({
        id: staff.id,
        full_name: values.full_name,
        role: values.role,
        branch_id: isBranchScoped ? (branchIds[0] ?? null) : null,
        linked_doctor_id: values.role === 'doctor' && values.linked_doctor_id !== 'none' ? values.linked_doctor_id : null,
        is_active: staff.is_active,
      })
      toast({ title: 'تم تحديث بيانات الموظف', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'تعذّر تحديث البيانات', description: (err as Error).message, variant: 'destructive' })
    }
  }

  if (!staff) return null
  const role = watch('role')
  const isBranchScoped = BRANCH_SCOPED_ROLES.includes(role)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل بيانات الموظف</DialogTitle>
          <DialogDescription dir="ltr">{staff.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <Label htmlFor="edit_full_name">الاسم الكامل</Label>
            <Input id="edit_full_name" {...register('full_name', { required: 'الاسم مطلوب' })} />
            {errors.full_name && <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p>}
          </div>
          <div>
            <Label>الدور</Label>
            <Select value={role} onValueChange={(v) => setValue('role', v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الفروع</Label>
            {isBranchScoped ? (
              <>
                <BranchCheckboxList
                  branches={branches ?? []}
                  selected={branchIds}
                  onChange={(ids) => {
                    setBranchIds(ids)
                    if (ids.length > 0) setBranchError(null)
                  }}
                />
                {branchError && <p className="mt-1 text-xs text-destructive">{branchError}</p>}
                {!branchError && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    تقدري تحددي أكتر من فرع لو الموظف بيشتغل في أكتر من مكان
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
                الدور ده بيشوف بيانات كل الفروع تلقائيًا، مش محتاج تحديد فرع
              </p>
            )}
          </div>
          {role === 'doctor' && (
            <div>
              <Label>مرتبط بسجل الدكتور</Label>
              <Select value={watch('linked_doctor_id')} onValueChange={(v) => setValue('linked_doctor_id', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون ربط</SelectItem>
                  {doctors?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  staff,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff?: StaffMember
}) {
  const resetPassword = useResetStaffPassword()
  const [password, setPassword] = React.useState('')

  React.useEffect(() => {
    if (open) setPassword(generateTempPassword())
  }, [open])

  function copyPassword() {
    navigator.clipboard.writeText(password)
    toast({ title: 'تم نسخ كلمة المرور' })
  }

  async function handleConfirm() {
    if (!staff) return
    try {
      await resetPassword.mutateAsync({ userId: staff.id, newPassword: password })
      toast({
        title: 'تم تغيير كلمة المرور',
        description: `شارك كلمة المرور الجديدة دي مع الموظف: ${password}`,
        variant: 'success',
      })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'تعذّر تغيير كلمة المرور', description: (err as Error).message, variant: 'destructive' })
    }
  }

  if (!staff) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
          <DialogDescription>
            لـ {staff.full_name} — الحساب القديم مش هيقدر يدخل بيه تاني، شاركي الكلمة الجديدة معاه بعد الحفظ
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="reset_password">كلمة المرور الجديدة</Label>
          <div className="flex items-center gap-2">
            <Input id="reset_password" ltr value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="button" variant="outline" size="icon" onClick={() => setPassword(generateTempPassword())}>
              <RefreshCw className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
              <Copy className="size-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleConfirm} disabled={resetPassword.isPending || password.length < 6}>
            {resetPassword.isPending ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور الجديدة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function StaffPage() {
  const { data: staff, isLoading, error } = useStaff()
  const { profile } = useAuth()
  const updateStaff = useUpdateStaff()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | undefined>()
  const [resettingStaff, setResettingStaff] = React.useState<StaffMember | undefined>()
  const [confirmTarget, setConfirmTarget] = React.useState<StaffMember | undefined>()

  async function handleToggleActive() {
    if (!confirmTarget) return
    try {
      await updateStaff.mutateAsync({
        id: confirmTarget.id,
        full_name: confirmTarget.full_name,
        role: confirmTarget.role,
        branch_id: confirmTarget.branch_id,
        linked_doctor_id: confirmTarget.linked_doctor_id,
        is_active: !confirmTarget.is_active,
      })
      toast({
        title: confirmTarget.is_active ? 'تم إيقاف حساب الموظف' : 'تم تفعيل حساب الموظف',
        variant: 'success',
      })
      setConfirmTarget(undefined)
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          إضافة موظف بتنشئ حساب دخول حقيقي فورًا — شاركي بيانات الدخول معاه بعد الإنشاء
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          إضافة موظف
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>الفرع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={6}>جارٍ التحميل...</TableEmpty>
            ) : error ? (
              <TableEmpty colSpan={6}>
                <span className="text-destructive">تعذّر تحميل الموظفين: {(error as Error).message}</span>
              </TableEmpty>
            ) : staff && staff.length > 0 ? (
              staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className={cn('font-semibold', s.id === profile?.id && 'text-primary')}>
                    {s.full_name}
                    {s.id === profile?.id && ' (أنتِ)'}
                  </TableCell>
                  <TableCell className="text-muted-foreground" dir="ltr">
                    {s.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleLabels[s.role]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{staffBranchLabel(s)}</TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? 'success' : 'muted'}>{s.is_active ? 'نشط' : 'متوقف'}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingStaff(s)}>
                          <Pencil className="size-4" />
                          تعديل البيانات
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResettingStaff(s)}>
                          <KeyRound className="size-4" />
                          إعادة تعيين كلمة المرور
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive={s.is_active}
                          onClick={() => setConfirmTarget(s)}
                          disabled={s.id === profile?.id}
                        >
                          {s.is_active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                          {s.is_active ? 'إيقاف الحساب' : 'إعادة التفعيل'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={6}>لا يوجد موظفون بعد</TableEmpty>
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateStaffDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditStaffDialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(undefined)} staff={editingStaff} />
      <ResetPasswordDialog
        open={!!resettingStaff}
        onOpenChange={(open) => !open && setResettingStaff(undefined)}
        staff={resettingStaff}
      />
      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(undefined)}
        title={confirmTarget?.is_active ? 'إيقاف حساب الموظف؟' : 'إعادة تفعيل الحساب؟'}
        description={
          confirmTarget?.is_active
            ? 'الموظف مش هيقدر يدخل النظام تاني لحد ما تفعّليه، لكن كل سجله وأعماله السابقة هتفضل محفوظة.'
            : 'الموظف هيقدر يدخل النظام تاني بنفس بياناته.'
        }
        confirmLabel={confirmTarget?.is_active ? 'إيقاف الحساب' : 'تفعيل'}
        variant={confirmTarget?.is_active ? 'destructive' : 'default'}
        onConfirm={handleToggleActive}
        loading={updateStaff.isPending}
      />
    </div>
  )
}
