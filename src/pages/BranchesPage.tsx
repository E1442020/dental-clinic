import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Plus, MapPin, Phone, CheckCircle2, Building2, MoreVertical, Pencil, Power, PowerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBranches, useCreateBranch, useUpdateBranch, useSetBranchActive } from '@/features/branches/api'
import { useBranchContext } from '@/features/branches/BranchContext'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { Branch } from '@/types/database'

interface FormValues {
  name: string
  address: string
  phone: string
}

function BranchFormDialog({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch?: Branch
}) {
  const isEdit = !!branch
  const createBranch = useCreateBranch()
  const updateBranch = useUpdateBranch()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  React.useEffect(() => {
    if (open) {
      reset({ name: branch?.name ?? '', address: branch?.address ?? '', phone: branch?.phone ?? '' })
    }
  }, [open, branch, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateBranch.mutateAsync({ id: branch.id, ...values })
        toast({ title: 'تم تحديث بيانات الفرع', variant: 'success' })
      } else {
        await createBranch.mutateAsync(values)
        toast({ title: 'تم إضافة الفرع', variant: 'success' })
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
          <DialogTitle>{isEdit ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name">اسم الفرع</Label>
            <Input id="name" {...register('name', { required: 'اسم الفرع مطلوب' })} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="address">العنوان</Label>
            <Input id="address" {...register('address')} />
          </div>
          <div>
            <Label htmlFor="phone">الهاتف</Label>
            <Input id="phone" ltr {...register('phone')} />
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

export default function BranchesPage() {
  const { data: branches, isLoading } = useBranches({ includeInactive: true })
  const { currentBranchId, setCurrentBranchId, isLocked } = useBranchContext()
  const setActive = useSetBranchActive()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingBranch, setEditingBranch] = React.useState<Branch | undefined>()
  const [confirmTarget, setConfirmTarget] = React.useState<Branch | undefined>()
  const activeBranchCount = branches?.filter((b) => b.is_active).length ?? 0

  function openCreate() {
    setEditingBranch(undefined)
    setFormOpen(true)
  }

  function openEdit(branch: Branch) {
    setEditingBranch(branch)
    setFormOpen(true)
  }

  async function handleToggleActive() {
    if (!confirmTarget) return
    try {
      await setActive.mutateAsync({ id: confirmTarget.id, isActive: !confirmTarget.is_active })
      toast({
        title: confirmTarget.is_active ? 'تم إيقاف تفعيل الفرع' : 'تم تفعيل الفرع',
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
          {isLocked
            ? 'فرعك محدد من مسؤول العيادة ولا يمكن تغييره من هنا'
            : 'دوس "تعيين كفرع العمل" عشان تحدد الفرع اللي هتشتغل عليه دلوقتي — هيستخدم في كل حجز وعلاج وفاتورة تسجّلها'}
        </p>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          إضافة فرع
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground">جارٍ التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches?.map((b) => {
            const isCurrent = b.id === currentBranchId
            const isLastActiveBranch = b.is_active && activeBranchCount <= 1
            return (
              <Card key={b.id} className={cn(isCurrent && 'ring-2 ring-primary')}>
                <CardContent className="flex flex-col gap-2 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold">{b.name}</p>
                    <div className="flex items-center gap-1.5">
                      {!b.is_active && <Badge variant="muted">غير نشط</Badge>}
                      {isCurrent && (
                        <Badge variant="success">
                          <CheckCircle2 className="size-3.5" />
                          الفرع الحالي
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(b)}>
                            <Pencil className="size-4" />
                            تعديل البيانات
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            destructive={b.is_active}
                            disabled={isLastActiveBranch}
                            title={isLastActiveBranch ? 'لازم يفضل فرع نشط واحد على الأقل' : undefined}
                            onClick={() => setConfirmTarget(b)}
                          >
                            {b.is_active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                            {b.is_active ? 'إيقاف التفعيل' : 'إعادة التفعيل'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {b.address && (
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {b.address}
                    </p>
                  )}
                  {b.phone && (
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="size-3.5" />
                      <span dir="ltr">{b.phone}</span>
                    </p>
                  )}
                  {!isLocked && !isCurrent && b.is_active && (
                    <Button size="sm" variant="outline" className="mt-1" onClick={() => setCurrentBranchId(b.id)}>
                      <Building2 className="size-3.5" />
                      تعيين كفرع العمل
                    </Button>
                  )}
                  {isLastActiveBranch && (
                    <p className="text-xs text-muted-foreground">لازم يفضل فرع نشط واحد على الأقل</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
          {branches?.length === 0 && <p className="text-muted-foreground">لا توجد فروع بعد</p>}
        </div>
      )}

      <BranchFormDialog open={formOpen} onOpenChange={setFormOpen} branch={editingBranch} />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(undefined)}
        title={confirmTarget?.is_active ? 'إيقاف تفعيل الفرع؟' : 'إعادة تفعيل الفرع؟'}
        description={
          confirmTarget?.is_active
            ? 'الفرع مش هيظهر كخيار في المواعيد والعلاجات والفواتير الجديدة، لكن كل سجله القديم هيفضل محفوظ.'
            : 'الفرع هيظهر تاني كخيار في كل الشاشات.'
        }
        confirmLabel={confirmTarget?.is_active ? 'إيقاف التفعيل' : 'تفعيل'}
        variant={confirmTarget?.is_active ? 'destructive' : 'default'}
        onConfirm={handleToggleActive}
        loading={setActive.isPending}
      />
    </div>
  )
}
