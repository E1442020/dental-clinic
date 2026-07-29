import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import type { ClinicSettings } from '@/types/database'

/** null means the clinic hasn't been set up yet (no row) — drives the onboarding prompt.
 * Explicitly filtered (and keyed) by the caller's own clinic_id rather than relying only on RLS
 * to narrow an unfiltered query to one row — otherwise, right after switching accounts, this
 * could momentarily read a cached result meant for a different clinic and flash the onboarding
 * dialog open then immediately closed (or skip it entirely) before the real data settles. */
export function useClinicSettings() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['clinic-settings', profile?.clinic_id],
    enabled: !!profile?.clinic_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_settings')
        .select('*')
        .eq('clinic_id', profile!.clinic_id)
        .maybeSingle()
      if (error) throw error
      return data as ClinicSettings | null
    },
  })
}

export function useSaveClinicSettings() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; whatsapp_number: string | null }) => {
      const { data, error } = await supabase
        .from('clinic_settings')
        .upsert({ ...input }, { onConflict: 'clinic_id' })
        .select()
        .single()
      if (error) throw error
      return data as ClinicSettings
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic-settings', profile?.clinic_id] }),
  })
}
