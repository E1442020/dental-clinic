import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Plus, MoreVertical, Pencil, Power, PowerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  useInsurances,
  useCreateInsurance,
  useUpdateInsurance,
  useSetInsuranceActive,
} from '@/features/insurance/api'
import { InsuranceClaimsPanel } from '@/features/insurance/InsuranceClaimsPanel'
import { useAuth } from '@/features/auth/AuthProvider'
import { toast } from '@/hooks/use-toast'
import type { Insurance } from '@/types/database'

interface FormValues {
  company_name: string
  contact_phone: string
  contract_details: string
}

function InsuranceFormDialog({
  open,
  onOpenChange,
  insurance,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  insurance?: Insurance
}) {
  const isEdit = !!insurance
  const createInsurance = useCreateInsurance()
  const updateInsurance = useUpdateInsurance()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  React.useEffect(() => {
    if (open) {
      reset({
        company_name: insurance?.company_name ?? '',
        contact_phone: insurance?.contact_phone ?? '',
        contract_details: insurance?.contract_details ?? '',
      })
    }
  }, [open, insurance, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateInsurance.mutateAsync({ id: insurance.id, ...values })
        toast({ title: 'تم تحديث بيانات الشركة', variant: 'success' })
      } else {
        await createInsurance.mutateAsync(values)
        toast({ title: 'تم إضافة شركة التأمين', variant: 'success' })
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
          <DialogTitle>{isEdit ? 'تعديل شركة التأمين' : 'إضافة شركة تأمين'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <Label htmlFor="company_name">اسم الشركة</Label>
            <Input id="company_name" {...register('company_name', { required: 'اسم الشركة مطلوب' })} />
            {errors.company_name && <p className="mt-1 text-xs text-destructive">{errors.company_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="contact_phone">هاتف التواصل</Label>
            <Input id="contact_phone" ltr {...register('contact_phone')} />
          </div>
          <div>
            <Label htmlFor="contract_details">تفاصيل العقد</Label>
            <textarea
              id="contract_details"
              rows={3}
              {...register('contract_details')}
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
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

function InsuranceCompaniesTab() {
  const { data: insurances, isLoading } = useInsurances({ includeInactive: true })
  const setActive = useSetInsuranceActive()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingInsurance, setEditingInsurance] = React.useState<Insurance | undefined>()
  const [confirmTarget, setConfirmTarget] = React.useState<Insurance | undefined>()

  function openCreate() {
    setEditingInsurance(undefined)
    setFormOpen(true)
  }

  function openEdit(insurance: Insurance) {
    setEditingInsurance(insurance)
    setFormOpen(true)
  }

  async function handleToggleActive() {
    if (!confirmTarget) return
    try {
      await setActive.mutateAsync({ id: confirmTarget.id, isActive: !confirmTarget.is_active })
      toast({
        title: confirmTarget.is_active ? 'تم إيقاف تفعيل الشركة' : 'تم تفعيل الشركة',
        variant: 'success',
      })
      setConfirmTarget(undefined)
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            إضافة شركة تأمين
          </Button>
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الشركة</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>الحالة</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={isAdmin ? 4 : 3}>جارٍ التحميل...</TableEmpty>
            ) : insurances && insurances.length > 0 ? (
              insurances.map((ins) => (
                <TableRow key={ins.id}>
                  <TableCell className="font-semibold">{ins.company_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ins.contact_phone ? <span dir="ltr">{ins.contact_phone}</span> : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ins.is_active ? 'success' : 'muted'}>
                      {ins.is_active ? 'نشطة' : 'غير نشطة'}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(ins)}>
                            <Pencil className="size-4" />
                            تعديل البيانات
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive={ins.is_active} onClick={() => setConfirmTarget(ins)}>
                            {ins.is_active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                            {ins.is_active ? 'إيقاف التفعيل' : 'إعادة التفعيل'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={isAdmin ? 4 : 3}>لا توجد شركات تأمين بعد</TableEmpty>
            )}
          </TableBody>
        </Table>
      </Card>

      <InsuranceFormDialog open={formOpen} onOpenChange={setFormOpen} insurance={editingInsurance} />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(undefined)}
        title={confirmTarget?.is_active ? 'إيقاف تفعيل الشركة؟' : 'إعادة تفعيل الشركة؟'}
        description={
          confirmTarget?.is_active
            ? 'الشركة مش هتظهر في قوائم الاختيار الجديدة، لكن كل بياناتها وفواتيرها القديمة هتفضل محفوظة.'
            : 'الشركة هتظهر تاني في قوائم اختيار التأمين.'
        }
        confirmLabel={confirmTarget?.is_active ? 'إيقاف التفعيل' : 'تفعيل'}
        variant={confirmTarget?.is_active ? 'destructive' : 'default'}
        onConfirm={handleToggleActive}
        loading={setActive.isPending}
      />
    </div>
  )
}

export default function InsurancePage() {
  return (
    <Tabs defaultValue="companies">
      <TabsList>
        <TabsTrigger value="companies">شركات التأمين</TabsTrigger>
        <TabsTrigger value="claims">تحصيل التأمين</TabsTrigger>
      </TabsList>
      <TabsContent value="companies">
        <InsuranceCompaniesTab />
      </TabsContent>
      <TabsContent value="claims">
        <InsuranceClaimsPanel />
      </TabsContent>
    </Tabs>
  )
}
