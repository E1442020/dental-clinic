import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Insurance } from '@/types/database'

export function useInsurances(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false
  return useQuery({
    queryKey: ['insurances', includeInactive ? 'all' : 'active'],
    queryFn: async () => {
      let query = supabase.from('insurances').select('*').order('company_name')
      if (!includeInactive) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) throw error
      return data as Insurance[]
    },
  })
}

export type InsuranceInput = {
  company_name: string
  contact_phone?: string
  contract_details?: string
}

export function useCreateInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: InsuranceInput) => {
      const { data, error } = await supabase.from('insurances').insert(input).select().single()
      if (error) throw error
      return data as Insurance
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurances'] }),
  })
}

export function useUpdateInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: InsuranceInput & { id: string }) => {
      const { data, error } = await supabase.from('insurances').update(input).eq('id', id).select().single()
      if (error) throw error
      return data as Insurance
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurances'] }),
  })
}

export function useSetInsuranceActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('insurances').update({ is_active: isActive }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurances'] }),
  })
}
