import { toothLabel } from '@/features/dental-chart/toothLabels'
import { paymentMethodLabels, invoiceStatusLabels } from '@/lib/roles'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InvoiceWithPayments } from './api'

/** Formatted receipt. The caller is responsible for wrapping this in #invoice-print-area
 * *outside* any fixed-position ancestor (e.g. not directly inside a Dialog) — see the
 * @media print rule in index.css, which repositions that element absolutely relative to the
 * page; nested inside something with `position: fixed` (like Radix Dialog's content box) it
 * repositions relative to that instead and gets clipped. */
export function InvoicePrintView({
  invoice,
  patientName,
  patientPhone,
  clinicName,
}: {
  invoice: InvoiceWithPayments
  patientName: string
  patientPhone: string
  clinicName?: string
}) {
  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount_paid), 0)
  const remaining = Number(invoice.patient_due_amount) - paid

  return (
    <div className="flex flex-col gap-4 p-2 text-sm">
      <div className="flex items-start justify-between border-b border-border pb-3">
        <div>
          <p className="text-lg font-bold">{clinicName ?? 'عيادة الأسنان'}</p>
          {invoice.branches?.name && <p className="text-xs text-muted-foreground">{invoice.branches.name}</p>}
        </div>
        <div className="text-end">
          <p className="text-xs text-muted-foreground">تاريخ الإصدار</p>
          <p className="font-semibold">{formatDate(invoice.issue_date)}</p>
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">المريض</p>
          <p className="font-semibold">{patientName}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">
            {patientPhone}
          </p>
        </div>
        <div className="text-end">
          <p className="text-xs text-muted-foreground">حالة الفاتورة</p>
          <p className="font-semibold">{invoiceStatusLabels[invoice.status]}</p>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="py-1 text-start font-normal">البيان</th>
            <th className="py-1 text-end font-normal">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-2">
              {invoice.treatments?.procedure_type ?? 'إجراء علاجي'}
              {invoice.treatments?.tooth_number ? ` — ${toothLabel(invoice.treatments.tooth_number)}` : ''}
            </td>
            <td className="py-2 text-end">{formatCurrency(Number(invoice.total_amount))}</td>
          </tr>
          {Number(invoice.insurance_covered_amount) > 0 && (
            <tr className="border-b border-border text-secondary">
              <td className="py-2">تغطية التأمين</td>
              <td className="py-2 text-end">- {formatCurrency(Number(invoice.insurance_covered_amount))}</td>
            </tr>
          )}
        </tbody>
      </table>

      {invoice.payments.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">الدفعات المسجّلة</p>
          <div className="flex flex-col gap-1">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-xs">
                <span>
                  {formatDate(p.payment_date)} · {paymentMethodLabels[p.payment_method]}
                </span>
                <span>{formatCurrency(Number(p.amount_paid))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
        <span>{remaining > 0 ? 'المتبقي على المريض' : 'تم السداد بالكامل'}</span>
        <span>{formatCurrency(remaining)}</span>
      </div>

      <p className="text-center text-xs text-muted-foreground">شكرًا لزيارتكم</p>
    </div>
  )
}
