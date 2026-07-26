import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Appointment, AppointmentStatus } from '@/types/database'

export interface AppointmentWithRelations extends Appointment {
  patients: { full_name: string; phone: string } | null
  doctors: { full_name: string } | null
  branches: { name: string } | null
}

export function useAppointmentsByDate(date: string, branchId?: string) {
  return useQuery({
    queryKey: ['appointments', 'by-date', date, branchId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('*, patients(full_name, phone), doctors(full_name), branches(name)')
        .eq('appointment_date', date)
        .order('start_time')
      if (branchId) query = query.eq('branch_id', branchId)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as AppointmentWithRelations[]
    },
  })
}

/** Used to compute free slots — must include the doctor's appointments across ALL branches. */
export function useDoctorAppointmentsOnDate(doctorId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['appointments', 'by-doctor-date', doctorId, date],
    enabled: !!doctorId && !!date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('doctor_id', doctorId as string)
        .eq('appointment_date', date as string)
        .neq('status', 'cancelled')
      if (error) throw error
      return data as { start_time: string; end_time: string; status: AppointmentStatus }[]
    },
  })
}

export function usePatientAppointments(patientId: string | undefined) {
  return useQuery({
    queryKey: ['appointments', 'by-patient', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, doctors(full_name), branches(name)')
        .eq('patient_id', patientId as string)
        .order('appointment_date', { ascending: false })
      if (error) throw error
      return data as unknown as AppointmentWithRelations[]
    },
  })
}

export type AppointmentInput = {
  patient_id: string
  doctor_id: string
  branch_id: string
  appointment_date: string
  start_time: string
  end_time: string
  reason?: string | null
  notes?: string | null
}

const OVERLAP_ERROR = '23P01'

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AppointmentInput) => {
      const { data, error } = await supabase.from('appointments').insert(input).select().single()
      if (error) {
        if (error.code === OVERLAP_ERROR) {
          throw new Error('هذا الموعد يتعارض مع موعد آخر محجوز لنفس الدكتور')
        }
        throw error
      }
      return data as Appointment
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Appointment
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })
}
