import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Treatment } from '@/types/database'

export interface TreatmentWithDoctor extends Treatment {
  doctors: { full_name: string } | null
}

export function useTreatments(patientId: string | undefined) {
  return useQuery({
    queryKey: ['treatments', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatments')
        .select('*, doctors(full_name)')
        .eq('patient_id', patientId as string)
        .order('procedure_date', { ascending: false })
      if (error) throw error
      return data as unknown as TreatmentWithDoctor[]
    },
  })
}

export type TreatmentInput = {
  patient_id: string
  doctor_id: string
  branch_id: string
  tooth_number?: number | null
  procedure_type: string
  procedure_date: string
  cost: number
  notes?: string | null
}

export function useCreateTreatment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TreatmentInput) => {
      const { data, error } = await supabase.from('treatments').insert(input).select().single()
      if (error) throw error
      return data as Treatment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatments', data.patient_id] })
      queryClient.invalidateQueries({ queryKey: ['dental-chart', data.patient_id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

/** Doesn't touch the linked invoice itself — the create_invoice_on_treatment trigger only fires
 * on INSERT, so callers that also want to keep an unpaid invoice's amount in sync with an edited
 * cost (see TreatmentFormFields) do that as a separate step via useUpdateInvoiceCost. */
export function useUpdateTreatment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: TreatmentInput & { id: string }) => {
      const { data, error } = await supabase.from('treatments').update(input).eq('id', id).select().single()
      if (error) throw error
      return data as Treatment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatments', data.patient_id] })
      queryClient.invalidateQueries({ queryKey: ['dental-chart', data.patient_id] })
    },
  })
}

export const commonProcedures = ['كشف', 'حشو', 'خلع', 'تنظيف', 'عصب', 'تركيب', 'تبييض', 'زراعة', 'تقويم']

const TREATMENT_PHOTOS_BUCKET = 'treatment-photos'

/** Uploads a before/after photo to private storage and saves its path on the treatment row.
 * The path is prefixed with the clinic id — the storage RLS policy checks that first segment
 * against auth_clinic_id(), so photos stay isolated between clinics in the shared bucket. */
export function useUploadTreatmentPhoto() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({
      treatmentId,
      patientId,
      kind,
      file,
    }: {
      treatmentId: string
      patientId: string
      kind: 'before' | 'after'
      file: File
    }) => {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${profile?.clinic_id}/${patientId}/${treatmentId}-${kind}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from(TREATMENT_PHOTOS_BUCKET).upload(path, file)
      if (uploadError) throw uploadError

      // A computed key ({ [column]: path }) types as a generic string index signature, which
      // supabase-js's Update type rejects — an explicit branch keeps each object's keys literal.
      const update = kind === 'before' ? { before_image_url: path } : { after_image_url: path }
      const { data, error } = await supabase
        .from('treatments')
        .update(update)
        .eq('id', treatmentId)
        .select()
        .single()
      if (error) throw error
      return data as Treatment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatments', data.patient_id] })
    },
  })
}

/** Deletes a before/after photo from storage and clears its column on the treatment row. */
export function useDeleteTreatmentPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      treatmentId,
      kind,
      path,
    }: {
      treatmentId: string
      patientId: string
      kind: 'before' | 'after'
      path: string
    }) => {
      const { error: removeError } = await supabase.storage.from(TREATMENT_PHOTOS_BUCKET).remove([path])
      if (removeError) throw removeError

      const update = kind === 'before' ? { before_image_url: null } : { after_image_url: null }
      const { data, error } = await supabase
        .from('treatments')
        .update(update)
        .eq('id', treatmentId)
        .select()
        .single()
      if (error) throw error
      return data as Treatment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatments', data.patient_id] })
    },
  })
}

/** Short-lived signed URL for a private treatment photo path (the bucket isn't public). */
export function useTreatmentPhotoUrl(path: string | null) {
  return useQuery({
    queryKey: ['treatment-photo-url', path],
    enabled: !!path,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(TREATMENT_PHOTOS_BUCKET)
        .createSignedUrl(path as string, 3600)
      if (error) throw error
      return data.signedUrl
    },
  })
}
