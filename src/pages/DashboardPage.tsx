import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, CalendarCheck, Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatCurrency, toISODate } from '@/lib/utils'

const AnalyticsSection = React.lazy(() => import('@/features/analytics/AnalyticsSection'))

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = toISODate(new Date())

      const [patients, todayAppointments, unpaidInvoices] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase
          .from('appointments')
          .select('id, status', { count: 'exact' })
          .eq('appointment_date', today),
        supabase
          .from('invoices')
          .select('patient_due_amount, payments(amount_paid)')
          .in('status', ['unpaid', 'partial']),
      ])

      const unpaidRows = (unpaidInvoices.data ?? []) as unknown as {
        patient_due_amount: number
        payments: { amount_paid: number }[]
      }[]
      const outstanding = unpaidRows.reduce((sum, i) => {
        const paid = i.payments.reduce((s, p) => s + Number(p.amount_paid), 0)
        return sum + (Number(i.patient_due_amount) - paid)
      }, 0)

      return {
        totalPatients: patients.count ?? 0,
        todayCount: todayAppointments.count ?? 0,
        outstanding,
      }
    },
  })
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboardStats()
  const { profile } = useAuth()

  const stats = [
    { label: 'إجمالي المرضى', value: data?.totalPatients, icon: Users, color: 'text-primary bg-accent' },
    { label: 'مواعيد اليوم', value: data?.todayCount, icon: CalendarCheck, color: 'text-success bg-success/10' },
    {
      label: 'مستحقات غير محصلة',
      value: data ? formatCurrency(data.outstanding) : undefined,
      icon: Receipt,
      color: 'text-warning bg-warning/15',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{isLoading ? '...' : (stat.value ?? '—')}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {profile?.role === 'admin' && (
        <React.Suspense fallback={<p className="text-sm text-muted-foreground">جارٍ تحميل التحليلات...</p>}>
          <AnalyticsSection />
        </React.Suspense>
      )}
    </div>
  )
}
