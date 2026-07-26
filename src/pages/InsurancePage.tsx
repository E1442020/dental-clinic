import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useInsurances, useCreateInsurance } from '@/features/insurance/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { toast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

interface FormValues {
  company_name: string
  coverage_percentage: number
  annual_limit: string
  contact_phone: string
  contract_details: string
}

export default function InsurancePage() {
  const { data: insurances, isLoading } = useInsurances()
  const createInsurance = useCreateInsurance()
  const { profile } = useAuth()
  const [open, setOpen] = React.useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    try {
      await createInsurance.mutateAsync({
        ...values,
        coverage_percentage: Number(values.coverage_percentage),
        annual_limit: values.annual_limit ? Number(values.annual_limit) : null,
      })
      toast({ title: 'تم إضافة شركة التأمين', variant: 'success' })
      reset()
      setOpen(false)
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {profile?.role === 'admin' && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
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
              <TableHead>نسبة التغطية</TableHead>
              <TableHead>الحد السنوي</TableHead>
              <TableHead>الهاتف</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={4}>جارٍ التحميل...</TableEmpty>
            ) : insurances && insurances.length > 0 ? (
              insurances.map((ins) => (
                <TableRow key={ins.id}>
                  <TableCell className="font-semibold">{ins.company_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ins.coverage_percentage}%</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ins.annual_limit ? formatCurrency(ins.annual_limit) + ' / سنة' : 'بدون حد أقصى'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ins.contact_phone ? <span dir="ltr">{ins.contact_phone}</span> : '—'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={4}>لا توجد شركات تأمين بعد</TableEmpty>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة شركة تأمين</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <div>
              <Label htmlFor="company_name">اسم الشركة</Label>
              <Input id="company_name" {...register('company_name', { required: 'اسم الشركة مطلوب' })} />
              {errors.company_name && <p className="mt-1 text-xs text-destructive">{errors.company_name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="coverage_percentage">نسبة التغطية (%)</Label>
                <Input
                  id="coverage_percentage"
                  type="number"
                  min={0}
                  max={100}
                  {...register('coverage_percentage', { required: 'نسبة التغطية مطلوبة' })}
                />
                {errors.coverage_percentage && (
                  <p className="mt-1 text-xs text-destructive">{errors.coverage_percentage.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="annual_limit">الحد الأقصى للتغطية سنويًا</Label>
                <Input id="annual_limit" type="number" min={0} step="0.01" placeholder="بدون حد أقصى" {...register('annual_limit')} />
              </div>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
