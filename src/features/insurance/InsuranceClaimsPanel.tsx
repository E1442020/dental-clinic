import * as React from 'react'
import { CheckCircle2, XCircle, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table'
import { useAllClaims, useResolveClaim, useRecordClaimCollection, type ClaimWithDetails } from './claims-api'
import { useInsurances } from './api'
import { claimStatusLabels } from '@/lib/roles'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { ClaimStatus } from '@/types/database'

const claimStatusVariant = { pending: 'warning', approved: 'success', rejected: 'destructive' } as const

function collectedOf(claim: ClaimWithDetails) {
  return claim.insurance_claim_collections.reduce((s, c) => s + Number(c.amount), 0)
}

function ResolveClaimDialog({ claim, onOpenChange }: { claim: ClaimWithDetails; onOpenChange: (open: boolean) => void }) {
  const resolveClaim = useResolveClaim()
  const [decision, setDecision] = React.useState<'approved' | 'rejected'>('approved')
  const [approvedAmount, setApprovedAmount] = React.useState(String(claim.claim_amount))
  const [notes, setNotes] = React.useState('')

  async function handleSave() {
    if (decision === 'approved' && (!approvedAmount || Number(approvedAmount) <= 0)) {
      toast({ title: 'أدخلي المبلغ اللي وافقت عليه الشركة', variant: 'destructive' })
      return
    }
    try {
      await resolveClaim.mutateAsync({
        claim,
        status: decision,
        approvedAmount: decision === 'approved' ? Number(approvedAmount) : undefined,
        notes,
      })
      toast({ title: 'تم تحديث حالة المطالبة', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>الرد على مطالبة {claim.insurances?.company_name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Select value={decision} onValueChange={(v) => setDecision(v as typeof decision)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">موافقة</SelectItem>
              <SelectItem value="rejected">رفض</SelectItem>
            </SelectContent>
          </Select>
          {decision === 'approved' && (
            <div>
              <Label>المبلغ اللي الشركة وافقت تحاسب عليه</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label>ملاحظات (اختياري)</Label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={resolveClaim.isPending}>
            {resolveClaim.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CollectionDialog({ claim, onOpenChange }: { claim: ClaimWithDetails; onOpenChange: (open: boolean) => void }) {
  const recordCollection = useRecordClaimCollection()
  const remaining = Number(claim.approved_amount ?? 0) - collectedOf(claim)
  const [amount, setAmount] = React.useState(String(remaining > 0 ? remaining : 0))
  const [receivedDate, setReceivedDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = React.useState('')

  async function handleSave() {
    const value = Number(amount)
    if (!value || value <= 0) {
      toast({ title: 'أدخلي مبلغًا صحيحًا', variant: 'destructive' })
      return
    }
    try {
      await recordCollection.mutateAsync({ claimId: claim.id, amount: value, receivedDate, notes })
      toast({ title: 'تم تسجيل التحصيل', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'حدث خطأ', description: (err as Error).message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل تحصيل من {claim.insurances?.company_name}</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg bg-accent px-3 py-2.5 text-center">
          <p className="text-xs text-muted-foreground">المتبقي تحصيله</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(remaining)}</p>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <Label>المبلغ المُحصَّل</Label>
            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>تاريخ التحصيل</Label>
            <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
          </div>
          <div>
            <Label>ملاحظات (اختياري)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={recordCollection.isPending}>
            {recordCollection.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InsuranceClaimsPanel() {
  const [statusFilter, setStatusFilter] = React.useState<ClaimStatus | 'all'>('all')
  const [insuranceFilter, setInsuranceFilter] = React.useState<string>('all')
  const { data: insurances } = useInsurances({ includeInactive: true })
  const { data: claims, isLoading } = useAllClaims({
    status: statusFilter === 'all' ? undefined : statusFilter,
    insuranceId: insuranceFilter === 'all' ? undefined : insuranceFilter,
  })
  const [resolvingClaim, setResolvingClaim] = React.useState<ClaimWithDetails | null>(null)
  const [collectingClaim, setCollectingClaim] = React.useState<ClaimWithDetails | null>(null)

  const summaryByCompany = React.useMemo(() => {
    const map = new Map<string, { name: string; pending: number; awaitingCollection: number; collected: number }>()
    for (const c of claims ?? []) {
      const name = c.insurances?.company_name ?? '—'
      const entry = map.get(name) ?? { name, pending: 0, awaitingCollection: 0, collected: 0 }
      const collected = collectedOf(c)
      if (c.status === 'pending') entry.pending += Number(c.claim_amount)
      if (c.status === 'approved') entry.awaitingCollection += Math.max(Number(c.approved_amount ?? 0) - collected, 0)
      entry.collected += collected
      map.set(name, entry)
    }
    return Array.from(map.values())
  }, [claims])

  return (
    <div className="flex flex-col gap-4">
      {summaryByCompany.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaryByCompany.map((s) => (
            <Card key={s.name}>
              <CardContent className="flex flex-col gap-1.5 pt-5 text-sm">
                <p className="font-bold">{s.name}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">قيد المراجعة</span>
                  <span className="font-semibold">{formatCurrency(s.pending)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">موافق عليه ولسه ما تحصلش</span>
                  <span className="font-semibold text-warning">{formatCurrency(s.awaitingCollection)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">متحصّل</span>
                  <span className="font-semibold text-success">{formatCurrency(s.collected)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(claimStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل شركات التأمين</SelectItem>
            {insurances?.map((ins) => (
              <SelectItem key={ins.id} value={ins.id}>
                {ins.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المريض</TableHead>
              <TableHead>الشركة</TableHead>
              <TableHead>المبلغ المطلوب</TableHead>
              <TableHead>الموافق عليه</TableHead>
              <TableHead>المتحصّل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الإرسال</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={8}>جارٍ التحميل...</TableEmpty>
            ) : claims && claims.length > 0 ? (
              claims.map((c) => {
                const collected = collectedOf(c)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.patients?.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.insurances?.company_name}</TableCell>
                    <TableCell>{formatCurrency(Number(c.claim_amount))}</TableCell>
                    <TableCell>{c.approved_amount != null ? formatCurrency(Number(c.approved_amount)) : '—'}</TableCell>
                    <TableCell className={cn(collected > 0 && 'font-semibold text-success')}>
                      {formatCurrency(collected)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={claimStatusVariant[c.status]}>{claimStatusLabels[c.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.submitted_date)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {c.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => setResolvingClaim(c)}>
                            <CheckCircle2 className="size-3.5" />
                            الرد
                          </Button>
                        )}
                        {c.status === 'approved' && collected < Number(c.approved_amount ?? 0) && (
                          <Button size="sm" variant="outline" onClick={() => setCollectingClaim(c)}>
                            <Banknote className="size-3.5" />
                            تسجيل تحصيل
                          </Button>
                        )}
                        {c.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <XCircle className="size-3.5" />
                            مرفوضة
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableEmpty colSpan={8}>لا توجد مطالبات بعد</TableEmpty>
            )}
          </TableBody>
        </Table>
      </Card>

      {resolvingClaim && <ResolveClaimDialog claim={resolvingClaim} onOpenChange={() => setResolvingClaim(null)} />}
      {collectingClaim && <CollectionDialog claim={collectingClaim} onOpenChange={() => setCollectingClaim(null)} />}
    </div>
  )
}
