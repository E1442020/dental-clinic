import { Receipt, CheckCircle2, CircleAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { InvoiceWithPayments } from './api'

export function BillingSummary({ invoices }: { invoices: InvoiceWithPayments[] }) {
  const totalRequired = invoices.reduce((s, inv) => s + Number(inv.patient_due_amount), 0)
  const totalPaid = invoices.reduce(
    (s, inv) => s + inv.payments.reduce((sp, p) => sp + Number(p.amount_paid), 0),
    0,
  )
  const totalRemaining = totalRequired - totalPaid

  const stats = [
    { label: 'المطلوب من المريض', value: totalRequired, icon: Receipt, color: 'bg-accent text-primary' },
    { label: 'المدفوع', value: totalPaid, icon: CheckCircle2, color: 'bg-success/10 text-success' },
    {
      label: 'المتبقي',
      value: totalRemaining,
      icon: CircleAlert,
      color: totalRemaining > 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
              <stat.icon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold">{formatCurrency(stat.value)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
