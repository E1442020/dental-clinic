import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreatePatient, useUpdatePatient } from './api'
import { useInsurances } from '@/features/insurance/api'
import { useBranchContext } from '@/features/branches/BranchContext'
import { useAuth } from '@/features/auth/AuthProvider'
import { toast } from '@/hooks/use-toast'
import type { Patient } from '@/types/database'

const schema = z.object({
  full_name: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(8, 'رقم الهاتف مطلوب'),
  email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female']).optional(),
  address: z.string().optional().or(z.literal('')),
  national_id: z.string().optional().or(z.literal('')),
  emergency_contact_name: z.string().optional().or(z.literal('')),
  emergency_contact_phone: z.string().optional().or(z.literal('')),
  insurance_id: z.string().optional(),
  primary_branch_id: z.string().optional(),
  medical_history: z.string().optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export function PatientForm({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient?: Patient
}) {
  const isEdit = !!patient
  const { profile } = useAuth()
  const isClinical = profile?.role === 'admin' || profile?.role === 'doctor'
  const { data: insurances } = useInsurances()
  const { branches, currentBranchId } = useBranchContext()
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  React.useEffect(() => {
    if (open) {
      reset({
        full_name: patient?.full_name ?? '',
        phone: patient?.phone ?? '',
        email: patient?.email ?? '',
        date_of_birth: patient?.date_of_birth ?? '',
        gender: patient?.gender ?? undefined,
        address: patient?.address ?? '',
        national_id: patient?.national_id ?? '',
        emergency_contact_name: patient?.emergency_contact_name ?? '',
        emergency_contact_phone: patient?.emergency_contact_phone ?? '',
        insurance_id: patient?.insurance_id ?? undefined,
        primary_branch_id: patient?.primary_branch_id ?? currentBranchId,
        medical_history: patient?.medical_history ?? '',
        allergies: patient?.allergies ?? '',
      })
    }
  }, [open, patient, reset, currentBranchId])

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      email: values.email || null,
      date_of_birth: values.date_of_birth || null,
      address: values.address || null,
      national_id: values.national_id || null,
      emergency_contact_name: values.emergency_contact_name || null,
      emergency_contact_phone: values.emergency_contact_phone || null,
      insurance_id: values.insurance_id || null,
      primary_branch_id: values.primary_branch_id || null,
      medical_history: values.medical_history || null,
      allergies: values.allergies || null,
    }

    try {
      if (isEdit) {
        await updatePatient.mutateAsync({ id: patient.id, ...payload })
        toast({ title: 'تم تحديث بيانات المريض', variant: 'success' })
      } else {
        await createPatient.mutateAsync(payload)
        toast({ title: 'تم إضافة المريض بنجاح', variant: 'success' })
      }
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل بيانات المريض' : 'إضافة مريض جديد'}</DialogTitle>
          <DialogDescription>البيانات الأساسية تساعد الفريق على متابعة المريض بسهولة</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="full_name">الاسم الكامل *</Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="phone">رقم الهاتف *</Label>
            <Input id="phone" ltr {...register('phone')} />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" ltr {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="date_of_birth">تاريخ الميلاد</Label>
            <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
          </div>
          <div>
            <Label>النوع</Label>
            <Select value={watch('gender')} onValueChange={(v) => setValue('gender', v as 'male' | 'female')}>
              <SelectTrigger>
                <SelectValue placeholder="اختر النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">ذكر</SelectItem>
                <SelectItem value="female">أنثى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="national_id">الرقم القومي</Label>
            <Input id="national_id" ltr {...register('national_id')} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">العنوان</Label>
            <Input id="address" {...register('address')} />
          </div>
          <div>
            <Label>شركة التأمين</Label>
            <Select value={watch('insurance_id')} onValueChange={(v) => setValue('insurance_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="بدون تأمين" />
              </SelectTrigger>
              <SelectContent>
                {insurances?.map((ins) => (
                  <SelectItem key={ins.id} value={ins.id}>
                    {ins.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الفرع الأساسي</Label>
            <Select value={watch('primary_branch_id')} onValueChange={(v) => setValue('primary_branch_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الفرع" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="emergency_contact_name">جهة اتصال للطوارئ</Label>
            <Input id="emergency_contact_name" {...register('emergency_contact_name')} />
          </div>
          <div>
            <Label htmlFor="emergency_contact_phone">هاتف الطوارئ</Label>
            <Input id="emergency_contact_phone" ltr {...register('emergency_contact_phone')} />
          </div>

          {isClinical && (
            <>
              <div className="sm:col-span-2">
                <Label htmlFor="allergies">الحساسيات</Label>
                <Input id="allergies" {...register('allergies')} placeholder="مثال: حساسية من البنسلين" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="medical_history">التاريخ المرضي</Label>
                <textarea
                  id="medical_history"
                  {...register('medical_history')}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </>
          )}

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المريض'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
