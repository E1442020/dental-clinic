import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Branch } from '@/types/database'

export function useBranches(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false
  return useQuery({
    queryKey: ['branches', includeInactive ? 'all' : 'active'],
    queryFn: async () => {
      let query = supabase.from('branches').select('*').order('name')
      if (!includeInactive) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) throw error
      return data as Branch[]
    },
  })
}

export type BranchInput = { name: string; address?: string; phone?: string }

export function useCreateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: BranchInput) => {
      const { data, error } = await supabase.from('branches').insert(input).select().single()
      if (error) throw error
      return data as Branch
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: BranchInput & { id: string }) => {
      const { data, error } = await supabase.from('branches').update(input).eq('id', id).select().single()
      if (error) throw error
      return data as Branch
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  })
}

export function useSetBranchActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('branches').update({ is_active: isActive }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  })
}

/** Branch IDs a given user (receptionist, doctor, ...) is assigned to — see user_branches:
 * branch-scoped RLS checks membership here rather than a single fixed branch, since some staff
 * genuinely work across more than one branch. */
export function useUserBranchIds(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-branches', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_branches').select('branch_id').eq('user_id', userId as string)
      if (error) throw error
      return (data as { branch_id: string }[]).map((row) => row.branch_id)
    },
  })
}
