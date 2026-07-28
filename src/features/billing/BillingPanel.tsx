import * as React from 'react'
import { Plus, Wallet, ShieldCheck, Printer, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useInvoicesByPatient, useAddPayment, type InvoiceWithPayments } from './api'
import { useClaimByInvoice, useSubmitClaim } from '@/features/insurance/claims-api'
import { InvoiceForm } from './InvoiceForm'
import { InvoicePrintView } from './InvoicePrintView'
import { BillingSummary } from './BillingSummary'
import { usePatient } from '@/features/patients/api'
import { useClinicSettings } from '@/features/clinic-settings/api'
import { toothLabel } from '@/features/dental-chart/toothLabels'
import { invoiceStatusLabels, paymentMethodLabels, claimStatusLabels } from '@/lib/roles'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { PaymentMethod, Patient } from '@/types/database'

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

function ClaimSubmitDialog({
  invoice,
  patientId,
  insuranceId,
  onOpenChange,
}: {
  invoice: InvoiceWithPayments
  patientId: string
  insuranceId: string
  onOpenChange: (open: boolean) => void
}) {
  const submitClaim = useSubmitClaim()
  const [claimAmount, setClaimAmount] = React.useState(String(invoice.total_amount))

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
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'تعذّر إرسال المطالبة', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={submitClaim.isPending}>
            {submitClaim.isPending ? 'جارٍ الإرسال...' : 'إرسال'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InvoicePrintDialog({
  invoice,
  patientName,
  patientPhone,
  onOpenChange,
}: {
  invoice: InvoiceWithPayments
  patientName: string
  patientPhone: string
  onOpenChange: (open: boolean) => void
}) {
  const { data: clinicSettings } = useClinicSettings()

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <InvoicePrintView
            invoice={invoice}
            patientName={patientName}
            patientPhone={patientPhone}
            clinicName={clinicSettings?.name}
          />
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="size-4" />
              طباعة / حفظ PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Separate, normally-flowed print target — see the comment on InvoicePrintView for why
          this can't just be the copy above (nested inside the Dialog's fixed position box). */}
      <div id="invoice-print-area" className="hidden print:block">
        <InvoicePrintView
          invoice={invoice}
          patientName={patientName}
          patientPhone={patientPhone}
          clinicName={clinicSettings?.name}
        />
      </div>
    </>
  )
}

function InvoiceRow({
  invoice,
  patient,
}: {
  invoice: InvoiceWithPayments
  patient: Patient | undefined
}) {
  const { data: claim } = useClaimByInvoice(invoice.id)
  const [payOpen, setPayOpen] = React.useState(false)
  const [printOpen, setPrintOpen] = React.useState(false)
  const [claimOpen, setClaimOpen] = React.useState(false)

  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount_paid), 0)
  const remaining = Number(invoice.patient_due_amount) - paid
  const canClaimInsurance = !!patient?.insurance_id && !claim

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{formatCurrency(Number(invoice.total_amount))}</p>
            <Badge variant={statusVariant[invoice.status]}>{invoiceStatusLabels[invoice.status]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {invoice.treatments
              ? `${invoice.treatments.procedure_type}${invoice.treatments.tooth_number ? ` · ${toothLabel(invoice.treatments.tooth_number)}` : ''} · `
              : ''}
            {formatDate(invoice.issue_date)} · مدفوع {formatCurrency(paid)}
          </p>
          {Number(invoice.insurance_covered_amount) > 0 && (
            <p className="text-xs text-secondary">
              التأمين يغطي {formatCurrency(Number(invoice.insurance_covered_amount))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {claim && (
            <Badge variant={claimStatusVariant[claim.status]}>مطالبة التأمين: {claimStatusLabels[claim.status]}</Badge>
          )}
          <div className="text-end">
            <p className="text-xs text-muted-foreground">المتبقي</p>
            <p className={cn('font-bold', remaining > 0 ? 'text-destructive' : 'text-success')}>
              {formatCurrency(remaining)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {invoice.status !== 'paid' && (
                <DropdownMenuItem onClick={() => setPayOpen(true)}>
                  <Wallet className="size-4" />
                  تسجيل دفعة
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setPrintOpen(true)}>
                <Printer className="size-4" />
                طباعة
              </DropdownMenuItem>
              {canClaimInsurance && (
                <DropdownMenuItem onClick={() => setClaimOpen(true)}>
                  <ShieldCheck className="size-4" />
                  إرسال مطالبة للتأمين
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>

      {payOpen && <PaymentDialog invoice={invoice} onOpenChange={setPayOpen} />}
      {printOpen && patient && (
        <InvoicePrintDialog
          invoice={invoice}
          patientName={patient.full_name}
          patientPhone={patient.phone}
          onOpenChange={setPrintOpen}
        />
      )}
      {claimOpen && patient?.insurance_id && (
        <ClaimSubmitDialog
          invoice={invoice}
          patientId={patient.id}
          insuranceId={patient.insurance_id}
          onOpenChange={setClaimOpen}
        />
      )}
    </Card>
  )
}

export function BillingPanel({ patientId }: { patientId: string }) {
  const { data: invoices, isLoading } = useInvoicesByPatient(patientId)
  const { data: patient } = usePatient(patientId)
  const [invoiceFormOpen, setInvoiceFormOpen] = React.useState(false)

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
          {invoices.map((inv) => (
            <InvoiceRow key={inv.id} invoice={inv} patient={patient} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-muted-foreground">لا توجد فواتير لهذا المريض بعد</p>
      )}

      <InvoiceForm open={invoiceFormOpen} onOpenChange={setInvoiceFormOpen} patientId={patientId} />
    </div>
  )
}
