import * as React from 'react'
import { Plus, Wallet, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useInvoicesByPatient, useAddPayment, type InvoiceWithPayments } from './api'
import { useClaimByInvoice, useSubmitClaim } from '@/features/insurance/claims-api'
import { InvoiceForm } from './InvoiceForm'
import { BillingSummary } from './BillingSummary'
import { usePatient } from '@/features/patients/api'
import { toothLabel } from '@/features/dental-chart/toothLabels'
import { invoiceStatusLabels, paymentMethodLabels, claimStatusLabels } from '@/lib/roles'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { PaymentMethod } from '@/types/database'

const statusVariant = { unpaid: 'destructive', partial: 'warning', paid: 'success' } as const
const claimStatusVariant = { pending: 'warning', approved: 'success', rejected: 'destructive' } as const

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
  const [insuranceCovered, setInsuranceCovered] = React.useState(String(invoice.insurance_covered_amount))

  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount_paid), 0)
  const insuranceCoveredValue = Number(insuranceCovered || 0)
  const previewDue = Number(invoice.total_amount) - insuranceCoveredValue
  const remaining = previewDue - paid

  async function handleSave() {
    const value = Number(amount || 0)
    const insuranceChanged = insuranceCoveredValue !== Number(invoice.insurance_covered_amount)
    if (value <= 0 && !insuranceChanged) {
      toast({ title: 'أدخل مبلغًا صحيحًا أو عدّلي قيمة تغطية التأمين', variant: 'destructive' })
      return
    }
    try {
      await addPayment.mutateAsync({
        invoice,
        amount: value,
        method,
        insuranceCoveredAmount: insuranceChanged ? insuranceCoveredValue : undefined,
      })
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
          <p className="text-xs text-muted-foreground">المبلغ المتبقي على المريض</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(remaining)}</p>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <Label>المبلغ المدفوع من المريض</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="المبلغ"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
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
          <div>
            <Label>تغطية التأمين على الفاتورة دي</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={insuranceCovered}
              onChange={(e) => setInsuranceCovered(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              اكتبي هنا الرقم اللي شركة التأمين وافقت تحاسب عليه — هيتحدث في الفاتورة والحسابات فورًا
            </p>
          </div>
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

function ClaimAction({
  invoice,
  patientId,
  insuranceId,
}: {
  invoice: InvoiceWithPayments
  patientId: string
  insuranceId: string
}) {
  const { data: claim, isLoading } = useClaimByInvoice(invoice.id)
  const submitClaim = useSubmitClaim()
  const [claimAmount, setClaimAmount] = React.useState(String(invoice.total_amount))
  const [open, setOpen] = React.useState(false)

  if (isLoading) return null

  if (claim) {
    return (
      <Badge variant={claimStatusVariant[claim.status]}>
        مطالبة التأمين: {claimStatusLabels[claim.status]}
      </Badge>
    )
  }

  async function handleSubmit() {
    const value = Number(claimAmount)
    if (!value || value <= 0) {
      toast({ title: 'أدخل مبلغًا صحيحًا', variant: 'destructive' })
      return
    }
    try {
      await submitClaim.mutateAsync({
        invoice_id: invoice.id,
        patient_id: patientId,
        insurance_id: insuranceId,
        claim_amount: value,
      })
      toast({ title: 'تم إرسال المطالبة لشركة التأمين', variant: 'success' })
      setOpen(false)
    } catch (err) {
      toast({ title: 'تعذّر إرسال المطالبة', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ShieldCheck className="size-4" />
        إرسال مطالبة للتأمين
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال مطالبة لشركة التأمين</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label>المبلغ المطلوب من الشركة</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              متابعة الموافقة والتحصيل بعد كده من تاب "تحصيل التأمين" في صفحة شركات التأمين
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={submitClaim.isPending}>
              {submitClaim.isPending ? 'جارٍ الإرسال...' : 'إرسال'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function BillingPanel({ patientId }: { patientId: string }) {
  const { data: invoices, isLoading } = useInvoicesByPatient(patientId)
  const { data: patient } = usePatient(patientId)
  const [invoiceFormOpen, setInvoiceFormOpen] = React.useState(false)
  const [payingInvoice, setPayingInvoice] = React.useState<InvoiceWithPayments | null>(null)

  return (
    <div className="flex flex-col gap-4">
      {invoices && invoices.length > 0 && <BillingSummary invoices={invoices} />}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          يتم إنشاء الفاتورة تلقائيًا عند تسجيل أي علاج بتكلفة — تغطية التأمين بتتسجل بإيدك وقت الدفع أو بعد موافقة الشركة
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
                        ? `${inv.treatments.procedure_type}${inv.treatments.tooth_number ? ` · ${toothLabel(inv.treatments.tooth_number)}` : ''} · `
                        : ''}
                      {formatDate(inv.issue_date)} · مدفوع {formatCurrency(paid)}
                    </p>
                    {Number(inv.insurance_covered_amount) > 0 && (
                      <p className="text-xs text-secondary">
                        التأمين يغطي {formatCurrency(Number(inv.insurance_covered_amount))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {patient?.insurance_id && (
                      <ClaimAction invoice={inv} patientId={patientId} insuranceId={patient.insurance_id} />
                    )}
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
