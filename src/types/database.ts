export type UserRole = 'admin' | 'doctor' | 'receptionist' | 'accountant'
export type AppointmentStatus = 'booked' | 'completed' | 'cancelled' | 'no_show'
export type ToothStatus =
  | 'healthy'
  | 'filled'
  | 'extracted'
  | 'crowned'
  | 'needs_treatment'
  | 'root_canal'
  | 'implant'
export type ClaimStatus = 'pending' | 'approved' | 'rejected'
export type InvoiceStatus = 'unpaid' | 'partial' | 'paid'
export type PaymentMethod = 'cash' | 'card' | 'installment' | 'insurance' | 'transfer'
export type Gender = 'male' | 'female'

type Tables = {
  branches: {
    Row: {
      id: string
      name: string
      address: string | null
      phone: string | null
      is_active: boolean
      created_at: string
    }
    Insert: Partial<Tables['branches']['Row']> & { name: string }
    Update: Partial<Tables['branches']['Row']>
  }
  users: {
    Row: {
      id: string
      full_name: string
      email: string
      role: UserRole
      branch_id: string | null
      linked_doctor_id: string | null
      is_active: boolean
      created_at: string
    }
    Insert: Partial<Tables['users']['Row']> & {
      id: string
      full_name: string
      email: string
    }
    Update: Partial<Tables['users']['Row']>
  }
  insurances: {
    Row: {
      id: string
      company_name: string
      contact_phone: string | null
      contract_details: string | null
      is_active: boolean
      created_at: string
    }
    Insert: Partial<Tables['insurances']['Row']> & {
      company_name: string
    }
    Update: Partial<Tables['insurances']['Row']>
  }
  doctors: {
    Row: {
      id: string
      full_name: string
      specialty: string | null
      phone: string | null
      email: string | null
      is_active: boolean
      created_at: string
    }
    Insert: Partial<Tables['doctors']['Row']> & { full_name: string }
    Update: Partial<Tables['doctors']['Row']>
  }
  doctor_branches: {
    Row: {
      doctor_id: string
      branch_id: string
      working_days: string[]
      working_hours_start: string | null
      working_hours_end: string | null
    }
    Insert: Partial<Tables['doctor_branches']['Row']> & { doctor_id: string; branch_id: string }
    Update: Partial<Tables['doctor_branches']['Row']>
  }
  user_branches: {
    Row: {
      user_id: string
      branch_id: string
    }
    Insert: Partial<Tables['user_branches']['Row']> & { user_id: string; branch_id: string }
    Update: Partial<Tables['user_branches']['Row']>
  }
  patients: {
    Row: {
      id: string
      full_name: string
      phone: string
      email: string | null
      date_of_birth: string | null
      gender: Gender | null
      address: string | null
      national_id: string | null
      medical_history: string | null
      allergies: string | null
      emergency_contact_name: string | null
      emergency_contact_phone: string | null
      insurance_id: string | null
      primary_branch_id: string | null
      created_at: string
      updated_at: string
    }
    Insert: Partial<Tables['patients']['Row']> & {
      full_name: string
      phone: string
    }
    Update: Partial<Tables['patients']['Row']>
  }
  appointments: {
    Row: {
      id: string
      patient_id: string
      doctor_id: string
      branch_id: string
      appointment_date: string
      start_time: string
      end_time: string
      status: AppointmentStatus
      reason: string | null
      notes: string | null
      reminder_sent: boolean
      created_by: string | null
      created_at: string
    }
    Insert: Partial<Tables['appointments']['Row']> & {
      patient_id: string
      doctor_id: string
      branch_id: string
      appointment_date: string
      start_time: string
      end_time: string
    }
    Update: Partial<Tables['appointments']['Row']>
  }
  treatments: {
    Row: {
      id: string
      patient_id: string
      doctor_id: string
      appointment_id: string | null
      branch_id: string
      tooth_number: number | null
      procedure_type: string
      procedure_date: string
      cost: number
      notes: string | null
      before_image_url: string | null
      after_image_url: string | null
      created_at: string
    }
    Insert: Partial<Tables['treatments']['Row']> & {
      patient_id: string
      doctor_id: string
      branch_id: string
      procedure_type: string
    }
    Update: Partial<Tables['treatments']['Row']>
  }
  dental_chart: {
    Row: {
      id: string
      patient_id: string
      tooth_number: number
      current_status: ToothStatus
      last_updated: string
    }
    Insert: Partial<Tables['dental_chart']['Row']> & {
      patient_id: string
      tooth_number: number
    }
    Update: Partial<Tables['dental_chart']['Row']>
  }
  insurance_claims: {
    Row: {
      id: string
      patient_id: string
      insurance_id: string
      invoice_id: string
      claim_amount: number
      approved_amount: number | null
      status: ClaimStatus
      submitted_date: string
      resolved_date: string | null
      notes: string | null
    }
    Insert: Partial<Tables['insurance_claims']['Row']> & {
      patient_id: string
      insurance_id: string
      invoice_id: string
      claim_amount: number
    }
    Update: Partial<Tables['insurance_claims']['Row']>
  }
  insurance_claim_collections: {
    Row: {
      id: string
      claim_id: string
      amount: number
      received_date: string
      notes: string | null
      created_at: string
    }
    Insert: Partial<Tables['insurance_claim_collections']['Row']> & {
      claim_id: string
      amount: number
    }
    Update: Partial<Tables['insurance_claim_collections']['Row']>
  }
  invoices: {
    Row: {
      id: string
      patient_id: string
      treatment_id: string | null
      branch_id: string
      total_amount: number
      insurance_covered_amount: number
      patient_due_amount: number
      status: InvoiceStatus
      issue_date: string
      due_date: string | null
      created_at: string
    }
    Insert: Partial<Tables['invoices']['Row']> & {
      patient_id: string
      branch_id: string
    }
    Update: Partial<Tables['invoices']['Row']>
  }
  payments: {
    Row: {
      id: string
      invoice_id: string
      amount_paid: number
      payment_method: PaymentMethod
      payment_date: string
      received_by: string | null
      created_at: string
    }
    Insert: Partial<Tables['payments']['Row']> & {
      invoice_id: string
      amount_paid: number
      payment_method: PaymentMethod
    }
    Update: Partial<Tables['payments']['Row']>
  }
  clinic_settings: {
    Row: {
      id: true
      name: string
      whatsapp_number: string | null
      updated_at: string
    }
    Insert: Partial<Tables['clinic_settings']['Row']> & { name: string }
    Update: Partial<Tables['clinic_settings']['Row']>
  }
}

type WithRelationships<T> = { [K in keyof T]: T[K] & { Relationships: [] } }

export interface Database {
  public: {
    Tables: WithRelationships<Tables>
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

export type Patient = Tables['patients']['Row']
export type Doctor = Tables['doctors']['Row']
export type Branch = Tables['branches']['Row']
export type Appointment = Tables['appointments']['Row']
export type Treatment = Tables['treatments']['Row']
export type DentalChartEntry = Tables['dental_chart']['Row']
export type Insurance = Tables['insurances']['Row']
export type InsuranceClaim = Tables['insurance_claims']['Row']
export type InsuranceClaimCollection = Tables['insurance_claim_collections']['Row']
export type Invoice = Tables['invoices']['Row']
export type Payment = Tables['payments']['Row']
export type AppUser = Tables['users']['Row']
export type DoctorBranch = Tables['doctor_branches']['Row']
export type ClinicSettings = Tables['clinic_settings']['Row']
