import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Insurance } from '@/types/database'

export function useInsurances() {
  return useQuery({
    queryKey: ['insurances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('insurances').select('*').order('company_name')
      if (error) throw error
      return data as Insurance[]
    },
  })
}

export type InsuranceInput = {
  company_name: string
  coverage_percentage: number
  annual_limit?: number | null
  contact_phone?: string
  contract_details?: string
}

export function useCreateInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: InsuranceInput) => {
      const { data, error } = await supabase.from('insurances').insert(input).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurances'] }),
  })
}
