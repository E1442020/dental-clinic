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
}

export function useCreateDoctor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DoctorInput) => {
      const { data, error } = await supabase.from('doctors').insert(input).select().single()
      if (error) throw error
      return data as Doctor
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

export interface DoctorBranchSchedule {
  branch_id: string
  branch_name: string
  working_days: string[]
  working_hours_start: string | null
  working_hours_end: string | null
}

export function useDoctorBranchSchedules(doctorId: string | undefined) {
  return useQuery({
    queryKey: ['doctor-branches', doctorId],
    enabled: !!doctorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctor_branches')
        .select('branch_id, working_days, working_hours_start, working_hours_end, branches(name)')
        .eq('doctor_id', doctorId as string)
      if (error) throw error
      return (data as unknown as (DoctorBranchSchedule & { branches: { name: string } | null })[]).map((row) => ({
        branch_id: row.branch_id,
        branch_name: row.branches?.name ?? '',
        working_days: row.working_days,
        working_hours_start: row.working_hours_start,
        working_hours_end: row.working_hours_end,
      }))
    },
  })
}

export type DoctorBranchInput = {
  branch_id: string
  working_days: string[]
  working_hours_start: string
  working_hours_end: string
}

/** Replaces the doctor's full set of branch assignments/schedules in one go. */
export function useSetDoctorBranches() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ doctorId, branches }: { doctorId: string; branches: DoctorBranchInput[] }) => {
      const { error: deleteError } = await supabase.from('doctor_branches').delete().eq('doctor_id', doctorId)
      if (deleteError) throw deleteError

      if (branches.length > 0) {
        const { error: insertError } = await supabase
          .from('doctor_branches')
          .insert(branches.map((b) => ({ doctor_id: doctorId, ...b })))
        if (insertError) throw insertError
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-branches', variables.doctorId] })
      queryClient.invalidateQueries({ queryKey: ['doctors-for-branch'] })
    },
  })
}
