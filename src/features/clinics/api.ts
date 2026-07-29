import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeEdgeFunction } from '@/lib/edge-functions'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Clinic } from '@/types/database'

/** The caller's own clinic row. Explicitly filtered by clinic_id rather than relying on RLS to
 * narrow it to one row — the super-admin account can see every clinic (see migration
 * 0012_multi_tenant.sql), so an unfiltered query would return more than one row for them and
 * break `.maybeSingle()`. Drives the trial banner/gate — `trialEndsAt` is null for unlimited
 * clinics. */
export function useClinic() {
  const { session, profile } = useAuth()
  const query = useQuery({
    queryKey: ['clinic', profile?.clinic_id],
    enabled: !!session && !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('clinics').select('*').eq('id', profile!.clinic_id).maybeSingle()
      if (error) throw error
      return data as Clinic | null
    },
  })

  const clinic = query.data
  const trialEndsAt = clinic?.trial_ends_at ? new Date(clinic.trial_ends_at) : null
  const isExpired = trialEndsAt ? trialEndsAt.getTime() < Date.now() : false
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null

  return {
    clinic,
    // `isPending` (not `isLoading`) — stays true until the first real result arrives, even
    // across an enabled:false -> true transition (e.g. right when `profile` finishes loading).
    // `isLoading` is `isPending && isFetching`, and there's exactly one render in that transition
    // where the query is enabled but the fetch hasn't been dispatched yet, making `isFetching`
    // still false — `isLoading` would (wrongly) report "not loading" for that one render.
    isLoading: query.isPending,
    trialEndsAt,
    daysRemaining,
    isExpired,
    isDisabled: clinic?.is_active === false,
  }
}

export type SignupInput = { full_name: string; email: string; password: string }

/** Calls the signup-clinic Edge Function — the only public, unauthenticated entry point that
 * creates a brand-new clinic (auth user + clinics row + admin users row) for the 7-day free
 * trial. See supabase/functions/signup-clinic/index.ts. */
export function useSignupClinic() {
  return useMutation({
    mutationFn: (input: SignupInput) => invokeEdgeFunction<{ success: true }>('signup-clinic', input),
  })
}
