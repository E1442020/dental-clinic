import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeEdgeFunction } from '@/lib/edge-functions'
import type { Clinic, AppUser } from '@/types/database'

export interface ClinicWithUsers extends Clinic {
  users: AppUser[]
}

/** Every clinic that has ever signed up, with its staff embedded — only visible to the
 * developer's own account (RLS: auth_is_super_admin()). See migration 0012_multi_tenant.sql. */
export function useAllClinics() {
  return useQuery({
    queryKey: ['super-admin', 'clinics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('*, users(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ClinicWithUsers[]
    },
  })
}

export type ClinicDetailsInput = {
  clinicId: string
  name: string
  isActive: boolean
  trialEndsAt: string | null
  subscriptionEndsAt: string | null
  notes: string | null
}

/** Saves everything editable from the "تعديل اشتراك العيادة" dialog in one call. */
export function useUpdateClinicDetails() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ClinicDetailsInput) => {
      const { error } = await supabase
        .from('clinics')
        .update({
          name: input.name,
          is_active: input.isActive,
          trial_ends_at: input.trialEndsAt,
          subscription_ends_at: input.subscriptionEndsAt,
          notes: input.notes,
        })
        .eq('id', input.clinicId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['super-admin', 'clinics'] }),
  })
}

export function useSetUserActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase.from('users').update({ is_active: isActive }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['super-admin', 'clinics'] }),
  })
}

export type CreateClinicInput = {
  full_name: string
  email: string
  password: string
  trial_days: number | null
  subscription_ends_at: string | null
}

/** Calls the super-admin-create-clinic Edge Function — lets the developer set someone up
 * directly (custom trial length or a permanent account) without them using /signup themselves. */
export function useCreateClinicBySuperAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClinicInput) =>
      invokeEdgeFunction<{ success: true }>('super-admin-create-clinic', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['super-admin', 'clinics'] }),
  })
}
