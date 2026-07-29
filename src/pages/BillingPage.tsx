import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table'
import { useAllInvoices } from '@/features/billing/api'
import { BillingSummary } from '@/features/billing/BillingSummary'
import { useBranchContext } from '@/features/branches/BranchContext'
import { invoiceStatusLabels } from '@/lib/roles'
import { formatCurrency, formatDate, toISODate } from '@/lib/utils'
import type { InvoiceStatus } from '@/types/database'

const statusVariant = { unpaid: 'destructive', partial: 'warning', paid: 'success' } as const

type BillingRangeKey = 'today' | 'week' | 'month' | 'all'

const billingRangeOptions: { key: BillingRangeKey; label: string }[] = [
  { key: 'today', label: 'يومي (اليوم)' },
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'all', label: 'كل الفواتير' },
]

function billingRangeToDates(range: BillingRangeKey) {
  const today = toISODate(new Date())
  if (range === 'today') return { from: today, to: today }
  if (range === 'all') return { from: undefined, to: undefined }

  const from = new Date()
  if (range === 'week') from.setDate(from.getDate() - from.getDay())
  else from.setDate(1)
  return { from: toISODate(from), to: today }
}

function InvoicesTable({
  status,
  from,
  to,
  branchId,
}: {
  status?: InvoiceStatus
  from?: string
  to?: string
  branchId?: string
}) {
  const { data: invoices, isLoading } = useAllInvoices(status, from, to, branchId)
  const navigate = useNavigate()

  const totalAmount = invoices?.reduce((s, inv) => s + Number(inv.total_amount), 0) ?? 0
  const totalDue =
    invoices?.reduce((s, inv) => {
      const paid = inv.payments.reduce((sp, p) => sp + Number(p.amount_paid), 0)
      return s + (Number(inv.patient_due_amount) - paid)
    }, 0) ?? 0

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المريض</TableHead>
            <TableHead>الإجمالي</TableHead>
            <TableHead>المستحق</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>تاريخ الإصدار</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableEmpty colSpan={5}>جارٍ التحميل...</TableEmpty>
          ) : invoices && invoices.length > 0 ? (
            invoices.map((inv) => {
              const paid = inv.payments.reduce((s, p) => s + Number(p.amount_paid), 0)
              return (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/patients/${inv.patient_id}`)}
                >
                  <TableCell className="font-semibold">{inv.patients?.full_name}</TableCell>
                  <TableCell>{formatCurrency(Number(inv.total_amount))}</TableCell>
                  <TableCell>{formatCurrency(Number(inv.patient_due_amount) - paid)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[inv.status]}>{invoiceStatusLabels[inv.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(inv.issue_date)}</TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableEmpty colSpan={5}>لا توجد فواتير في هذه الفترة</TableEmpty>
          )}
        </TableBody>
        {invoices && invoices.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell>الإجمالي</TableCell>
              <TableCell>{formatCurrency(totalAmount)}</TableCell>
              <TableCell>{formatCurrency(totalDue)}</TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </Card>
  )
}

export default function BillingPage() {
  const [range, setRange] = React.useState<BillingRangeKey>('today')
  const [branchId, setBranchId] = React.useState<string>('all')
  const { from, to } = billingRangeToDates(range)
  const { branches } = useBranchContext()
  const effectiveBranchId = branchId === 'all' ? undefined : branchId
  const { data: summaryInvoices } = useAllInvoices(undefined, from, to, effectiveBranchId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">ملخص الحسابات</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفروع</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as BillingRangeKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {billingRangeOptions.map((opt) => (
                <SelectItem key={opt.key} value={opt.key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {summaryInvoices && <BillingSummary invoices={summaryInvoices} />}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="unpaid">غير مدفوعة</TabsTrigger>
          <TabsTrigger value="partial">مدفوعة جزئيًا</TabsTrigger>
          <TabsTrigger value="paid">مدفوعة</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <InvoicesTable from={from} to={to} branchId={effectiveBranchId} />
        </TabsContent>
        <TabsContent value="unpaid">
          <InvoicesTable status="unpaid" from={from} to={to} branchId={effectiveBranchId} />
        </TabsContent>
        <TabsContent value="partial">
          <InvoicesTable status="partial" from={from} to={to} branchId={effectiveBranchId} />
        </TabsContent>
        <TabsContent value="paid">
          <InvoicesTable status="paid" from={from} to={to} branchId={effectiveBranchId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
