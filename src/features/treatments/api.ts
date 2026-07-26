import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Treatment } from '@/types/database'

export interface TreatmentWithDoctor extends Treatment {
  doctors: { full_name: string } | null
}

export function useTreatments(patientId: string | undefined) {
  return useQuery({
    queryKey: ['treatments', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatments')
        .select('*, doctors(full_name)')
        .eq('patient_id', patientId as string)
        .order('procedure_date', { ascending: false })
      if (error) throw error
      return data as unknown as TreatmentWithDoctor[]
    },
  })
}

export type TreatmentInput = {
  patient_id: string
  doctor_id: string
  branch_id: string
  tooth_number?: number | null
  procedure_type: string
  procedure_date: string
  cost: number
  notes?: string | null
}

export function useCreateTreatment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TreatmentInput) => {
      const { data, error } = await supabase.from('treatments').insert(input).select().single()
      if (error) throw error
      return data as Treatment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatments', data.patient_id] })
      queryClient.invalidateQueries({ queryKey: ['dental-chart', data.patient_id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export const commonProcedures = ['كشف', 'حشو', 'خلع', 'تنظيف', 'عصب', 'تركيب', 'تبييض', 'زراعة', 'تقويم']
