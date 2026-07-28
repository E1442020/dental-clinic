import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ClinicSettings } from '@/types/database'

/** null means the clinic hasn't been set up yet (no row) — drives the onboarding prompt. */
export function useClinicSettings() {
  return useQuery({
    queryKey: ['clinic-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clinic_settings').select('*').maybeSingle()
      if (error) throw error
      return data as ClinicSettings | null
    },
  })
}

export function useSaveClinicSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; whatsapp_number: string | null }) => {
      const { data, error } = await supabase
        .from('clinic_settings')
        .upsert({ id: true, ...input })
        .select()
        .single()
      if (error) throw error
      return data as ClinicSettings
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic-settings'] }),
  })
}
