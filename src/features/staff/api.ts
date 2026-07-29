import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeEdgeFunction } from '@/lib/edge-functions'
import type { AppUser, UserRole } from '@/types/database'

export interface StaffMember extends AppUser {
  /** Every branch this user is assigned to (via user_branches) — can be more than one. */
  user_branches: { branch: { name: string } | null }[]
}

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, user_branches(branch:branches(name))')
        .order('full_name')
      if (error) throw error
      return data as unknown as StaffMember[]
    },
  })
}

export type StaffUpdateInput = {
  full_name: string
  role: UserRole
  branch_id: string | null
  linked_doctor_id: string | null
  is_active: boolean
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: StaffUpdateInput & { id: string }) => {
      const { data, error } = await supabase.from('users').update(input).eq('id', id).select().single()
      if (error) throw error
      return data as AppUser
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export type CreateStaffInput = {
  full_name: string
  email: string
  password: string
  role: UserRole
  /** All branches this person is assigned to (a receptionist can work more than one) — the
   * first entry becomes their default/primary users.branch_id, the full set populates
   * user_branches, which is what branch-scoped RLS actually checks. */
  branch_ids: string[]
  linked_doctor_id?: string | null
}

/** Calls the create-staff-user Edge Function — the only place that can create a real login
 * (auth.users + the matching public.users row), since that needs the service role key, which
 * never touches the browser. See supabase/functions/create-staff-user/index.ts. */
export function useCreateStaffUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStaffInput) => invokeEdgeFunction<{ id: string }>('create-staff-user', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  })
}

/** Replaces a staff member's full set of branch assignments — admin-only, mirrors
 * useSetDoctorBranches. Also keeps users.branch_id (the default/primary branch) in sync. */
export function useSetUserBranches() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, branchIds }: { userId: string; branchIds: string[] }) => {
      const { error: deleteError } = await supabase.from('user_branches').delete().eq('user_id', userId)
      if (deleteError) throw deleteError

      if (branchIds.length > 0) {
        const { error: insertError } = await supabase
          .from('user_branches')
          .insert(branchIds.map((branch_id) => ({ user_id: userId, branch_id })))
        if (insertError) throw insertError
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ branch_id: branchIds[0] ?? null })
        .eq('id', userId)
      if (updateError) throw updateError
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['user-branches', variables.userId] })
    },
  })
}

/** Calls the reset-staff-password Edge Function — the free "forgot password" path for staff:
 * the employee asks the admin, who sets a new password for them here in one click. Changing
 * one's own (already-known) password is a separate, self-service flow in ProfilePage that
 * doesn't need the service role key. */
export function useResetStaffPassword() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      invokeEdgeFunction<{ success: true }>('reset-staff-password', { user_id: userId, new_password: newPassword }),
  })
}

export function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
