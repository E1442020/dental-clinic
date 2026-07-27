import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { nextInvoiceStatus } from '@/features/billing/api'
import type { ClaimStatus, InsuranceClaim } from '@/types/database'

export interface ClaimWithDetails extends InsuranceClaim {
  patients: { full_name: string } | null
  insurances: { company_name: string } | null
  invoices: { total_amount: number; issue_date: string } | null
  insurance_claim_collections: { id: string; amount: number; received_date: string; notes: string | null }[]
}

export function useAllClaims(filters?: { status?: ClaimStatus; insuranceId?: string }) {
  return useQuery({
    queryKey: ['insurance-claims', 'all', filters?.status ?? 'any', filters?.insuranceId ?? 'any'],
    queryFn: async () => {
      let query = supabase
        .from('insurance_claims')
        .select(
          '*, patients(full_name), insurances(company_name), invoices(total_amount, issue_date), insurance_claim_collections(id, amount, received_date, notes)',
        )
        .order('submitted_date', { ascending: false })
      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.insuranceId) query = query.eq('insurance_id', filters.insuranceId)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as ClaimWithDetails[]
    },
  })
}

export function useClaimByInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['insurance-claims', 'by-invoice', invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*, insurance_claim_collections(id, amount, received_date, notes)')
        .eq('invoice_id', invoiceId as string)
        .maybeSingle()
      if (error) throw error
      return data as (InsuranceClaim & { insurance_claim_collections: { id: string; amount: number }[] }) | null
    },
  })
}

export function useSubmitClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      invoice_id: string
      patient_id: string
      insurance_id: string
      claim_amount: number
    }) => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .insert({ ...input, status: 'pending' as ClaimStatus })
        .select()
        .single()
      if (error) throw error
      return data as InsuranceClaim
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] })
      queryClient.invalidateQueries({ queryKey: ['insurance-claims', 'by-invoice', data.invoice_id] })
    },
  })
}

/** Approve/reject a claim; approving also syncs the invoice's insurance_covered_amount. */
export function useResolveClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      claim,
      status,
      approvedAmount,
      notes,
    }: {
      claim: InsuranceClaim
      status: Extract<ClaimStatus, 'approved' | 'rejected'>
      approvedAmount?: number
      notes?: string
    }) => {
      const { error: claimError } = await supabase
        .from('insurance_claims')
        .update({
          status,
          approved_amount: status === 'approved' ? approvedAmount : null,
          resolved_date: new Date().toISOString().slice(0, 10),
          notes: notes || null,
        })
        .eq('id', claim.id)
      if (claimError) throw claimError

      if (status === 'approved' && approvedAmount !== undefined) {
        const { data: invoiceData, error: invoiceFetchError } = await supabase
          .from('invoices')
          .select('total_amount, payments(amount_paid)')
          .eq('id', claim.invoice_id)
          .single()
        if (invoiceFetchError) throw invoiceFetchError
        const invoice = invoiceData as unknown as { total_amount: number; payments: { amount_paid: number }[] }

        const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amount_paid), 0)
        const newPatientDue = Number(invoice.total_amount) - approvedAmount

        const { error: invoiceUpdateError } = await supabase
          .from('invoices')
          .update({
            insurance_covered_amount: approvedAmount,
            patient_due_amount: newPatientDue,
            status: nextInvoiceStatus(totalPaid, newPatientDue),
          })
          .eq('id', claim.invoice_id)
        if (invoiceUpdateError) throw invoiceUpdateError
      }

      return claim.invoice_id
    },
    onSuccess: (invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] })
      queryClient.invalidateQueries({ queryKey: ['insurance-claims', 'by-invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useRecordClaimCollection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      claimId,
      amount,
      receivedDate,
      notes,
    }: {
      claimId: string
      amount: number
      receivedDate?: string
      notes?: string
    }) => {
      const { error } = await supabase.from('insurance_claim_collections').insert({
        claim_id: claimId,
        amount,
        received_date: receivedDate,
        notes: notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance-claims'] }),
  })
}
