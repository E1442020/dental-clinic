import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateTreatment, commonProcedures } from './api'
import { useDoctorsForBranch } from '@/features/appointments/api'
import { useBranchContext } from '@/features/branches/BranchContext'
import { useAuth } from '@/features/auth/AuthProvider'
import { toast } from '@/hooks/use-toast'
import { toothOptions } from '@/features/dental-chart/toothLabels'

const schema = z.object({
  doctor_id: z.string().min(1, 'اختر الدكتور'),
  tooth_number: z.string().optional(),
  procedure_type: z.string().min(1, 'اختر نوع الإجراء'),
  procedure_date: z.string().min(1),
  cost: z.string().min(1, 'أدخل التكلفة').refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'أدخل رقمًا صحيحًا'),
  notes: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export function TreatmentFormFields({
  patientId,
  defaultTooth,
  onSaved,
  onCancel,
}: {
  patientId: string
  defaultTooth?: number
  onSaved: () => void
  onCancel?: () => void
}) {
  const { currentBranchId } = useBranchContext()
  const { data: doctors } = useDoctorsForBranch(currentBranchId)
  const { profile } = useAuth()
  const createTreatment = useCreateTreatment()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      doctor_id: profile?.role === 'doctor' ? (profile.linked_doctor_id ?? '') : '',
      tooth_number: defaultTooth ? String(defaultTooth) : '',
      procedure_date: new Date().toISOString().slice(0, 10),
      cost: '',
    },
  })

  async function onSubmit(values: FormValues) {
    if (!currentBranchId) {
      toast({ title: 'لازم تضيف فرع أولًا من صفحة الفروع', variant: 'destructive' })
      return
    }
    try {
      await createTreatment.mutateAsync({
        patient_id: patientId,
        doctor_id: values.doctor_id,
        branch_id: currentBranchId,
        tooth_number: values.tooth_number ? Number(values.tooth_number) : null,
        procedure_type: values.procedure_type,
        procedure_date: values.procedure_date,
        cost: Number(values.cost),
        notes: values.notes || null,
      })
      toast({ title: 'تم تسجيل العلاج بنجاح', variant: 'success' })
      onSaved()
    } catch (err) {
      toast({ title: 'تعذّر تسجيل العلاج', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>الدكتور</Label>
          <Select value={watch('doctor_id')} onValueChange={(v) => setValue('doctor_id', v)}>
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
          <Label>السنة (اختياري)</Label>
          <Select value={watch('tooth_number')} onValueChange={(v) => setValue('tooth_number', v)}>
            <SelectTrigger>
              <SelectValue placeholder="بدون" />
            </SelectTrigger>
            <SelectContent>
              {toothOptions.map((t) => (
                <SelectItem key={t.value} value={String(t.value)}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>نوع الإجراء</Label>
        <Select value={watch('procedure_type')} onValueChange={(v) => setValue('procedure_type', v)}>
          <SelectTrigger>
            <SelectValue placeholder="اختر الإجراء" />
          </SelectTrigger>
          <SelectContent>
            {commonProcedures.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.procedure_type && <p className="mt-1 text-xs text-destructive">{errors.procedure_type.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="procedure_date">تاريخ الإجراء</Label>
          <Input id="procedure_date" type="date" {...register('procedure_date')} />
        </div>
        <div>
          <Label htmlFor="cost">التكلفة</Label>
          <Input id="cost" type="number" min={0} step="0.01" {...register('cost')} />
          {errors.cost && <p className="mt-1 text-xs text-destructive">{errors.cost.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">ملاحظات</Label>
        <textarea
          id="notes"
          rows={2}
          {...register('notes')}
          className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ العلاج'}
        </Button>
      </div>
    </form>
  )
}
