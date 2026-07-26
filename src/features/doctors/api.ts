import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Doctor } from '@/types/database'

export function useDoctors(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false
  return useQuery({
    queryKey: ['doctors', includeInactive ? 'all' : 'active'],
    queryFn: async () => {
      let query = supabase.from('doctors').select('*').order('full_name')
      if (!includeInactive) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) throw error
      return data as Doctor[]
    },
  })
}

export type DoctorInput = {
  full_name: string
  specialty?: string
  phone?: string
  email?: string
  working_days?: string[]
  working_hours_start?: string | null
  working_hours_end?: string | null
}

export function useCreateDoctor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DoctorInput) => {
      const { data, error } = await supabase.from('doctors').insert(input).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctors'] }),
  })
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: DoctorInput & { id: string }) => {
      const { data, error } = await supabase.from('doctors').update(input).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctors'] }),
  })
}

export function useSetDoctorActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('doctors').update({ is_active: isActive }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctors'] }),
  })
}
