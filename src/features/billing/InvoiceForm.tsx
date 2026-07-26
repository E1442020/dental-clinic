import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useBranchContext } from '@/features/branches/BranchContext'
import { useCreateInvoice } from './api'
import { toast } from '@/hooks/use-toast'

const schema = z.object({
  total_amount: z
    .string()
    .min(1, 'أدخل مبلغًا صحيحًا')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'أدخل مبلغًا صحيحًا'),
  insurance_covered_amount: z
    .string()
    .refine((v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0), 'أدخل رقمًا صحيحًا'),
  due_date: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export function InvoiceForm({
  open,
  onOpenChange,
  patientId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
}) {
  const { currentBranchId, currentBranch } = useBranchContext()
  const createInvoice = useCreateInvoice()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { insurance_covered_amount: '0' } })

  React.useEffect(() => {
    if (open) reset({ total_amount: '', insurance_covered_amount: '0', due_date: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    if (!currentBranchId) {
      toast({ title: 'لازم تضيف فرع أولًا من صفحة الفروع', variant: 'destructive' })
      return
    }
    try {
      await createInvoice.mutateAsync({
        patient_id: patientId,
        branch_id: currentBranchId,
        total_amount: Number(values.total_amount),
        insurance_covered_amount: Number(values.insurance_covered_amount || 0),
        due_date: values.due_date || null,
      })
      toast({ title: 'تم إنشاء الفاتورة', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'تعذّر إنشاء الفاتورة', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>فاتورة إضافية</DialogTitle>
          {currentBranch && <DialogDescription>فرع {currentBranch.name}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_amount">إجمالي الفاتورة</Label>
              <Input id="total_amount" type="number" min={0} step="0.01" {...register('total_amount')} />
              {errors.total_amount && (
                <p className="mt-1 text-xs text-destructive">{errors.total_amount.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="insurance_covered_amount">تغطية التأمين</Label>
              <Input id="insurance_covered_amount" type="number" min={0} step="0.01" {...register('insurance_covered_amount')} />
            </div>
          </div>
          <div>
            <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
            <Input id="due_date" type="date" {...register('due_date')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جارٍ الحفظ...' : 'إنشاء الفاتورة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
