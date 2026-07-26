import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DentalChartEntry, ToothStatus } from '@/types/database'

export function useDentalChart(patientId: string | undefined) {
  return useQuery({
    queryKey: ['dental-chart', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dental_chart')
        .select('*')
        .eq('patient_id', patientId as string)
      if (error) throw error
      return data as DentalChartEntry[]
    },
  })
}

export function useSetToothStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      patientId,
      toothNumber,
      status,
    }: {
      patientId: string
      toothNumber: number
      status: ToothStatus
    }) => {
      const { data, error } = await supabase
        .from('dental_chart')
        .upsert(
          { patient_id: patientId, tooth_number: toothNumber, current_status: status, last_updated: new Date().toISOString() },
          { onConflict: 'patient_id,tooth_number' },
        )
        .select()
        .single()
      if (error) throw error
      return data as DentalChartEntry
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dental-chart', variables.patientId] })
    },
  })
}
