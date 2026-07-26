import * as React from 'react'
import { Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useInvoicesByPatient, useAddPayment, type InvoiceWithPayments } from './api'
import { InvoiceForm } from './InvoiceForm'
import { BillingSummary } from './BillingSummary'
import { usePatient } from '@/features/patients/api'
import { useInsurances } from '@/features/insurance/api'
import { invoiceStatusLabels, paymentMethodLabels } from '@/lib/roles'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { PaymentMethod } from '@/types/database'

const statusVariant = { unpaid: 'destructive', partial: 'warning', paid: 'success' } as const

function PaymentDialog({
  invoice,
  onOpenChange,
}: {
  invoice: InvoiceWithPayments
  onOpenChange: (open: boolean) => void
}) {
  const addPayment = useAddPayment()
  const [amount, setAmount] = React.useState('')
  const [method, setMethod] = React.useState<PaymentMethod>('cash')

  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount_paid), 0)
  const remaining = Number(invoice.patient_due_amount) - paid

  async function handleSave() {
    const value = Number(amount)
    if (!value || value <= 0) {
      toast({ title: 'أدخل مبلغًا صحيحًا', variant: 'destructive' })
      return
    }
    try {
      await addPayment.mutateAsync({ invoice, amount: value, method })
      toast({ title: 'تم تسجيل الدفعة', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'تعذّر تسجيل الدفعة', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg bg-accent px-3 py-2.5 text-center">
          <p className="text-xs text-muted-foreground">المبلغ المتبقي</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(remaining)}</p>
        </div>
        <div className="flex flex-col gap-4">
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="المبلغ"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={addPayment.isPending}>
            {addPayment.isPending ? 'جارٍ الحفظ...' : 'حفظ الدفعة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InsuranceLimitCard({ patientId, invoices }: { patientId: string; invoices: InvoiceWithPayments[] }) {
  const { data: patient } = usePatient(patientId)
  const { data: insurances } = useInsurances()
  const insurance = insurances?.find((i) => i.id === patient?.insurance_id)

  if (!insurance || !insurance.annual_limit) return null

  const currentYear = new Date().getFullYear()
  const usedThisYear = invoices
    .filter((inv) => new Date(inv.issue_date).getFullYear() === currentYear)
    .reduce((s, inv) => s + Number(inv.insurance_covered_amount), 0)
  const limit = Number(insurance.annual_limit)
  const remaining = Math.max(limit - usedThisYear, 0)
  const usedPct = Math.min((usedThisYear / limit) * 100, 100)

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-5">
        <div className="flex items-center justify-between text-sm">
          <p className="font-semibold">الحد السنوي لتأمين {insurance.company_name}</p>
          <p className="text-muted-foreground">
            استُخدم {formatCurrency(usedThisYear)} من {formatCurrency(limit)}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', usedPct >= 100 ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <p className={cn('text-xs font-medium', remaining > 0 ? 'text-muted-foreground' : 'text-destructive')}>
          {remaining > 0
            ? `متبقي ${formatCurrency(remaining)} لهذا العام`
            : 'تم استهلاك الحد السنوي بالكامل — أي علاج جديد على المريض بالكامل'}
        </p>
      </CardContent>
    </Card>
  )
}

export function BillingPanel({ patientId }: { patientId: string }) {
  const { data: invoices, isLoading } = useInvoicesByPatient(patientId)
  const [invoiceFormOpen, setInvoiceFormOpen] = React.useState(false)
  const [payingInvoice, setPayingInvoice] = React.useState<InvoiceWithPayments | null>(null)

  return (
    <div className="flex flex-col gap-4">
      {invoices && invoices.length > 0 && <BillingSummary invoices={invoices} />}
      {invoices && <InsuranceLimitCard patientId={patientId} invoices={invoices} />}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          يتم إنشاء الفاتورة تلقائيًا عند تسجيل أي علاج بتكلفة، مع خصم نسبة التأمين تلقائيًا لو المريض له تأمين
        </p>
        <Button size="sm" variant="outline" onClick={() => setInvoiceFormOpen(true)}>
          <Plus className="size-4" />
          فاتورة إضافية
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground">جارٍ التحميل...</p>
      ) : invoices && invoices.length > 0 ? (
        <div className="flex flex-col gap-3">
          {invoices.map((inv) => {
            const paid = inv.payments.reduce((s, p) => s + Number(p.amount_paid), 0)
            const remaining = Number(inv.patient_due_amount) - paid
            return (
              <Card key={inv.id}>
                <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{formatCurrency(Number(inv.total_amount))}</p>
                      <Badge variant={statusVariant[inv.status]}>{invoiceStatusLabels[inv.status]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inv.treatments
                        ? `${inv.treatments.procedure_type}${inv.treatments.tooth_number ? ` · سنة ${inv.treatments.tooth_number}` : ''} · `
                        : ''}
                      {formatDate(inv.issue_date)} · مدفوع {formatCurrency(paid)}
                    </p>
                    {Number(inv.insurance_covered_amount) > 0 && (
                      <p className="text-xs text-secondary">
                        التأمين يغطي {formatCurrency(Number(inv.insurance_covered_amount))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-end">
                      <p className="text-xs text-muted-foreground">المتبقي</p>
                      <p className={cn('font-bold', remaining > 0 ? 'text-destructive' : 'text-success')}>
                        {formatCurrency(remaining)}
                      </p>
                    </div>
                    {inv.status !== 'paid' && (
                      <Button size="sm" variant="outline" onClick={() => setPayingInvoice(inv)}>
                        <Wallet className="size-4" />
                        تسجيل دفعة
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <p className="py-8 text-center text-muted-foreground">لا توجد فواتير لهذا المريض بعد</p>
      )}

      <InvoiceForm open={invoiceFormOpen} onOpenChange={setInvoiceFormOpen} patientId={patientId} />
      {payingInvoice && <PaymentDialog invoice={payingInvoice} onOpenChange={() => setPayingInvoice(null)} />}
    </div>
  )
}
