import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClinicSettings, useSaveClinicSettings } from './api'
import { useBranches, useCreateBranch } from '@/features/branches/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { toast } from '@/hooks/use-toast'

interface FormValues {
  clinic_name: string
  whatsapp_number: string
  branch_name: string
  branch_address: string
  branch_phone: string
}

/** Blocks the app for the admin until the clinic's brand name (and first branch, if none exist
 * yet) are set — nothing to close/skip, since the sidebar and WhatsApp reminders depend on it. */
export function OnboardingSetup() {
  const { profile } = useAuth()
  const { data: clinicSettings, isLoading: loadingSettings } = useClinicSettings()
  const { data: branches, isLoading: loadingBranches } = useBranches({ includeInactive: true })
  const saveSettings = useSaveClinicSettings()
  const createBranch = useCreateBranch()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const isAdmin = profile?.role === 'admin'
  const stillLoading = loadingSettings || (isAdmin && loadingBranches)
  const needsSetup = isAdmin && !stillLoading && !clinicSettings
  const needsBranch = !loadingBranches && (branches?.length ?? 0) === 0

  if (!needsSetup) return null

  async function onSubmit(values: FormValues) {
    try {
      if (needsBranch) {
        await createBranch.mutateAsync({
          name: values.branch_name,
          address: values.branch_address || undefined,
          phone: values.branch_phone || undefined,
        })
      }
      await saveSettings.mutateAsync({
        name: values.clinic_name,
        whatsapp_number: values.whatsapp_number || null,
      })
      toast({ title: 'تم إعداد بيانات العيادة بنجاح', variant: 'success' })
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open>
      <DialogContent
        showClose={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>خطوة أخيرة قبل ما نبدأ</DialogTitle>
          <DialogDescription>
            البيانات دي هتظهر في الشريط الجانبي وفي رسايل تذكير المرضى بواتساب
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <Label htmlFor="clinic_name">اسم العيادة *</Label>
            <Input id="clinic_name" {...register('clinic_name', { required: 'اسم العيادة مطلوب' })} />
            {errors.clinic_name && <p className="mt-1 text-xs text-destructive">{errors.clinic_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="whatsapp_number">رقم واتساب العيادة (اختياري)</Label>
            <Input id="whatsapp_number" ltr placeholder="01xxxxxxxxx" {...register('whatsapp_number')} />
            <p className="mt-1 text-xs text-muted-foreground">
              هيتسجل كرقم مرجعي في رسايل التذكير — إرسال الرسالة نفسه بيتم من واتساب اللي شغال على جهاز الموظف وقت الإرسال
            </p>
          </div>

          {needsBranch && (
            <>
              <div className="border-t border-border pt-3">
                <p className="text-sm font-semibold">بيانات أول فرع</p>
              </div>
              <div>
                <Label htmlFor="branch_name">اسم الفرع *</Label>
                <Input id="branch_name" {...register('branch_name', { required: 'اسم الفرع مطلوب' })} />
                {errors.branch_name && <p className="mt-1 text-xs text-destructive">{errors.branch_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="branch_address">العنوان</Label>
                <Input id="branch_address" {...register('branch_address')} />
              </div>
              <div>
                <Label htmlFor="branch_phone">هاتف الفرع</Label>
                <Input id="branch_phone" ltr {...register('branch_phone')} />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ والمتابعة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
