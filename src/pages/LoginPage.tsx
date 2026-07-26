import * as React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function LoginPage() {
  const { session, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  if (session) {
    const from = (location.state as { from?: string })?.from ?? '/'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('من فضلك أدخل البريد الإلكتروني وكلمة المرور')
      return
    }

    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-b from-accent/40 to-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <ToothIcon className="size-7" />
          </div>
          <h1 className="text-xl font-bold">نظام إدارة العيادة</h1>
          <p className="text-sm text-muted-foreground">سجّل الدخول لمتابعة عملك</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>تسجيل الدخول</CardTitle>
            <CardDescription>استخدم البيانات التي أنشأها لك مسؤول العيادة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  placeholder="name@clinic.com"
                />
              </div>
              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" disabled={submitting} className="mt-2">
                {submitting ? 'جارٍ الدخول...' : 'دخول'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ToothIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C8.5 2 6 4.2 6 7.3c0 2.1.6 3.1 1 5.1.5 2.4.6 7.4 2.2 8.9.5.5 1.1.7 1.5.2.6-.7.4-2.4.7-3.8.2-1 .6-1.7 1.1-1.7.5 0 .9.7 1.1 1.7.3 1.4.1 3.1.7 3.8.4.5 1 .3 1.5-.2 1.6-1.5 1.7-6.5 2.2-8.9.4-2 1-3 1-5.1C18 4.2 15.5 2 12 2Z" />
    </svg>
  )
}
