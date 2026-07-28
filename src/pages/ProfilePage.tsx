import { useForm } from 'react-hook-form'
import { User as UserIcon, KeyRound, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/features/auth/AuthProvider'
import { useBranches } from '@/features/branches/api'
import { useClinicSettings, useSaveClinicSettings } from '@/features/clinic-settings/api'
import { roleLabels } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'

interface NameFormValues {
  full_name: string
}

interface PasswordFormValues {
  current_password: string
  password: string
  confirm: string
}

interface ClinicFormValues {
  name: string
  whatsapp_number: string
}

function ClinicSettingsCard() {
  const { data: clinicSettings } = useClinicSettings()
  const saveSettings = useSaveClinicSettings()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ClinicFormValues>({
    values: { name: clinicSettings?.name ?? '', whatsapp_number: clinicSettings?.whatsapp_number ?? '' },
  })

  async function onSubmit(values: ClinicFormValues) {
    try {
      await saveSettings.mutateAsync({ name: values.name, whatsapp_number: values.whatsapp_number || null })
      toast({ title: 'تم تحديث بيانات العيادة', variant: 'success' })
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-4" />
          بيانات العيادة
        </CardTitle>
        <CardDescription>الاسم ده بيظهر في الشريط الجانبي وفي رسايل تذكير المرضى بواتساب</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <Label htmlFor="clinic_name">اسم العيادة</Label>
            <Input id="clinic_name" {...register('name', { required: 'اسم العيادة مطلوب' })} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="clinic_whatsapp">رقم واتساب العيادة (اختياري)</Label>
            <Input id="clinic_whatsapp" ltr placeholder="01xxxxxxxxx" {...register('whatsapp_number')} />
            <p className="mt-1 text-xs text-muted-foreground">
              بيتسجل كرقم مرجعي في رسايل التذكير — إرسال الرسالة نفسه بيتم من واتساب اللي شغال على جهاز الموظف
            </p>
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty} className="w-fit">
            {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const { data: branches } = useBranches()
  const branchName = branches?.find((b) => b.id === profile?.branch_id)?.name

  const {
    register: registerName,
    handleSubmit: handleNameSubmit,
    reset: resetName,
    formState: { errors: nameErrors, isSubmitting: isSavingName, isDirty: isNameDirty },
  } = useForm<NameFormValues>({ values: { full_name: profile?.full_name ?? '' } })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors, isSubmitting: isSavingPassword },
  } = useForm<PasswordFormValues>()

  async function onSaveName(values: NameFormValues) {
    if (!profile) return
    try {
      const { error } = await supabase.from('users').update({ full_name: values.full_name }).eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      resetName({ full_name: values.full_name })
      toast({ title: 'تم تحديث الاسم', variant: 'success' })
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  async function onSavePassword(values: PasswordFormValues) {
    if (!profile) return
    if (values.password !== values.confirm) {
      toast({ title: 'كلمتا المرور غير متطابقتين', variant: 'destructive' })
      return
    }
    try {
      // Confirms identity before allowing the change — without this, anyone left signed in on
      // an unattended device could change the password without knowing the current one.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: values.current_password,
      })
      if (verifyError) {
        toast({ title: 'كلمة المرور الحالية غير صحيحة', variant: 'destructive' })
        return
      }
      const { error } = await supabase.auth.updateUser({ password: values.password })
      if (error) throw error
      resetPassword()
      toast({ title: 'تم تغيير كلمة المرور', variant: 'success' })
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  if (!profile) {
    return <p className="p-8 text-center text-muted-foreground">جارٍ التحميل...</p>
  }

  const initials = profile.full_name?.trim()?.[0] ?? '؟'

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Card>
        <CardContent className="flex items-center gap-4 pt-5">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-bold">{profile.full_name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{roleLabels[profile.role]}</Badge>
              {branchName && <Badge variant="muted">{branchName}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-4" />
            معلومات الحساب
          </CardTitle>
          <CardDescription>البريد الإلكتروني ثابت ولا يمكن تغييره من هنا</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNameSubmit(onSaveName)} noValidate className="flex flex-col gap-4">
            <div>
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input id="full_name" {...registerName('full_name', { required: 'الاسم مطلوب' })} />
              {nameErrors.full_name && (
                <p className="mt-1 text-xs text-destructive">{nameErrors.full_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" ltr value={profile.email} disabled readOnly />
            </div>
            <Button type="submit" disabled={isSavingName || !isNameDirty} className="w-fit">
              {isSavingName ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            تغيير كلمة المرور
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit(onSavePassword)} noValidate className="flex flex-col gap-4">
            <div>
              <Label htmlFor="current_password">كلمة المرور الحالية</Label>
              <PasswordInput
                id="current_password"
                autoComplete="current-password"
                {...registerPassword('current_password', { required: 'كلمة المرور الحالية مطلوبة' })}
              />
              {passwordErrors.current_password && (
                <p className="mt-1 text-xs text-destructive">{passwordErrors.current_password.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">كلمة المرور الجديدة</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                {...registerPassword('password', { required: 'كلمة المرور مطلوبة', minLength: { value: 6, message: 'لازم تكون 6 أحرف على الأقل' } })}
              />
              {passwordErrors.password && (
                <p className="mt-1 text-xs text-destructive">{passwordErrors.password.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                {...registerPassword('confirm', {
                  required: 'تأكيد كلمة المرور مطلوب',
                  validate: (value) => value === watchPassword('password') || 'كلمتا المرور غير متطابقتين',
                })}
              />
              {passwordErrors.confirm && (
                <p className="mt-1 text-xs text-destructive">{passwordErrors.confirm.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSavingPassword} className="w-fit">
              {isSavingPassword ? 'جارٍ الحفظ...' : 'تغيير كلمة المرور'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {profile.role === 'admin' && <ClinicSettingsCard />}
    </div>
  )
}
