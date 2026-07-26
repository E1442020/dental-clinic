import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/types/database'

export interface InvoiceWithPayments extends Invoice {
  payments: { id: string; amount_paid: number; payment_method: PaymentMethod; payment_date: string }[]
  treatments: { procedure_type: string; tooth_number: number | null } | null
}

export interface InvoiceWithPatient extends InvoiceWithPayments {
  patients: { full_name: string; phone: string } | null
}

export function useAllInvoices(status?: InvoiceStatus, from?: string, to?: string) {
  return useQuery({
    queryKey: ['invoices', 'all', status ?? 'any', from ?? '-', to ?? '-'],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(
          '*, payments(id, amount_paid, payment_method, payment_date), patients(full_name, phone), treatments(procedure_type, tooth_number)',
        )
        .order('issue_date', { ascending: false })
        .limit(500)
      if (status) query = query.eq('status', status)
      if (from) query = query.gte('issue_date', from)
      if (to) query = query.lte('issue_date', to)
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
        .select('*, payments(id, amount_paid, payment_method, payment_date), treatments(procedure_type, tooth_number)')
        .eq('patient_id', patientId as string)
        .order('issue_date', { ascending: false })
      if (error) throw error
      return data as unknown as InvoiceWithPayments[]
    },
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
function nextInvoiceStatus(totalPaid: number, dueAmount: number): InvoiceStatus {
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
    }: {
      invoice: InvoiceWithPayments
      amount: number
      method: PaymentMethod
    }) => {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({ invoice_id: invoice.id, amount_paid: amount, payment_method: method })
      if (paymentError) throw paymentError

      const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0) + amount
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: nextInvoiceStatus(totalPaid, Number(invoice.patient_due_amount)) })
        .eq('id', invoice.id)
      if (invoiceError) throw invoiceError

      return invoice.patient_id
    },
    onSuccess: (patientId) => queryClient.invalidateQueries({ queryKey: ['invoices', 'by-patient', patientId] }),
  })
}
