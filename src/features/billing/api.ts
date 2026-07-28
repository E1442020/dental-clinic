import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/types/database'

export interface InvoiceWithPayments extends Invoice {
  payments: { id: string; amount_paid: number; payment_method: PaymentMethod; payment_date: string }[]
  treatments: { procedure_type: string; tooth_number: number | null } | null
  branches: { name: string } | null
}

export interface InvoiceWithPatient extends InvoiceWithPayments {
  patients: { full_name: string; phone: string } | null
}

export function useAllInvoices(status?: InvoiceStatus, from?: string, to?: string, branchId?: string) {
  return useQuery({
    queryKey: ['invoices', 'all', status ?? 'any', from ?? '-', to ?? '-', branchId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(
          '*, payments(id, amount_paid, payment_method, payment_date), patients(full_name, phone), treatments(procedure_type, tooth_number), branches(name)',
        )
        .order('issue_date', { ascending: false })
        .limit(500)
      if (status) query = query.eq('status', status)
      if (from) query = query.gte('issue_date', from)
      if (to) query = query.lte('issue_date', to)
      if (branchId) query = query.eq('branch_id', branchId)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as InvoiceWithPatient[]
    },
  })
}

export function useInvoicesByPatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'by-patient', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(
          '*, payments(id, amount_paid, payment_method, payment_date), treatments(procedure_type, tooth_number), branches(name)',
        )
        .eq('patient_id', patientId as string)
        .order('issue_date', { ascending: false })
      if (error) throw error
      return data as unknown as InvoiceWithPayments[]
    },
  })
}

export interface InvoiceForTreatment {
  id: string
  total_amount: number
  insurance_covered_amount: number
  status: InvoiceStatus
}

/** The invoice auto-created for a treatment (if the treatment had a cost > 0 when created). */
export function useInvoiceByTreatment(treatmentId: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'by-treatment', treatmentId],
    enabled: !!treatmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, total_amount, insurance_covered_amount, status')
        .eq('treatment_id', treatmentId as string)
        .maybeSingle()
      if (error) throw error
      return data as InvoiceForTreatment | null
    },
  })
}

/** Keeps an invoice's amount in sync when its treatment's cost is edited — only safe to call
 * while the invoice is still 'unpaid' (see the costLocked check in TreatmentFormFields), since
 * once a payment or insurance amount has been recorded against it, recomputing the total here
 * would clobber that without touching the payments that were made against the old amount. */
export function useUpdateInvoiceCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      invoiceId,
      newTotalAmount,
      insuranceCoveredAmount,
    }: {
      invoiceId: string
      newTotalAmount: number
      insuranceCoveredAmount: number
    }) => {
      const newPatientDue = newTotalAmount - insuranceCoveredAmount
      const { error } = await supabase
        .from('invoices')
        .update({
          total_amount: newTotalAmount,
          patient_due_amount: newPatientDue,
          status: nextInvoiceStatus(0, newPatientDue),
        })
        .eq('id', invoiceId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export type InvoiceInput = {
  patient_id: string
  branch_id: string
  treatment_id?: string | null
  total_amount: number
  insurance_covered_amount: number
  due_date?: string | null
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: InvoiceInput) => {
      const patientDue = input.total_amount - input.insurance_covered_amount
      const { data, error } = await supabase
        .from('invoices')
        .insert({ ...input, patient_due_amount: patientDue, status: 'unpaid' as InvoiceStatus })
        .select()
        .single()
      if (error) throw error
      return data as Invoice
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ['invoices', 'by-patient', data.patient_id] }),
  })
}

/** `dueAmount` must be the patient's own share (patient_due_amount), not the gross total_amount —
 * otherwise an invoice covered partly by insurance can never reach "paid" even once the patient
 * has paid everything they actually owe. */
export function nextInvoiceStatus(totalPaid: number, dueAmount: number): InvoiceStatus {
  if (totalPaid <= 0) return 'unpaid'
  if (totalPaid >= dueAmount) return 'paid'
  return 'partial'
}

export function useAddPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      invoice,
      amount,
      method,
      insuranceCoveredAmount,
    }: {
      invoice: InvoiceWithPayments
      amount: number
      method: PaymentMethod
      /** Manually entered by the accountant once the insurer confirms what it'll pay — overrides the invoice's current coverage. */
      insuranceCoveredAmount?: number
    }) => {
      if (amount > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({ invoice_id: invoice.id, amount_paid: amount, payment_method: method })
        if (paymentError) throw paymentError
      }

      const newInsuranceCovered = insuranceCoveredAmount ?? Number(invoice.insurance_covered_amount)
      const newPatientDue = Number(invoice.total_amount) - newInsuranceCovered
      const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0) + amount

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          insurance_covered_amount: newInsuranceCovered,
          patient_due_amount: newPatientDue,
          status: nextInvoiceStatus(totalPaid, newPatientDue),
        })
        .eq('id', invoice.id)
      if (invoiceError) throw invoiceError

      return invoice.patient_id
    },
    onSuccess: (patientId) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'by-patient', patientId] })
      queryClient.invalidateQueries({ queryKey: ['invoices', 'all'] })
    },
  })
}
