import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Patient } from '@/types/database'

export const PATIENTS_PAGE_SIZE = 20

export function usePatients(search: string, page: number) {
  return useQuery({
    queryKey: ['patients', search, page],
    queryFn: async () => {
      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (search.trim()) {
        const term = search.trim()
        query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,national_id.ilike.%${term}%`)
      }
      const from = page * PATIENTS_PAGE_SIZE
      const { data, error, count } = await query.range(from, from + PATIENTS_PAGE_SIZE - 1)
      if (error) throw error
      return { patients: data as Patient[], totalCount: count ?? 0 }
    },
  })
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ['patients', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('*').eq('id', id as string).single()
      if (error) throw error
      return data as Patient
    },
  })
}

export type PatientInput = Omit<Patient, 'id' | 'created_at' | 'updated_at'>

export function useCreatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<PatientInput> & { full_name: string; phone: string }) => {
      const { data, error } = await supabase.from('patients').insert(input).select().single()
      if (error) throw error
      return data as Patient
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export function useUpdatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<PatientInput> & { id: string }) => {
      const { data, error } = await supabase.from('patients').update(input).eq('id', id).select().single()
      if (error) throw error
      return data as Patient
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patients', 'detail', data.id] })
    },
  })
}
