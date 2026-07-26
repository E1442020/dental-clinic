import * as React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Pencil, Phone, Mail, MapPin, ShieldCheck, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { usePatient } from '@/features/patients/api'
import { PatientForm } from '@/features/patients/PatientForm'
import { useInsurances } from '@/features/insurance/api'
import { usePatientAppointments } from '@/features/appointments/api'
import { AppointmentForm } from '@/features/appointments/AppointmentForm'
import { useTreatments } from '@/features/treatments/api'
import { TreatmentForm } from '@/features/treatments/TreatmentForm'
import { DentalChartView } from '@/features/dental-chart/DentalChartView'
import { BillingPanel } from '@/features/billing/BillingPanel'
import { useAuth } from '@/features/auth/AuthProvider'
import { appointmentStatusLabels } from '@/lib/roles'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isClinical = profile?.role === 'admin' || profile?.role === 'doctor'
  const { data: patient, isLoading } = usePatient(id)
  const { data: insurances } = useInsurances()
  const [editOpen, setEditOpen] = React.useState(false)
  const [apptFormOpen, setApptFormOpen] = React.useState(false)
  const [treatmentFormOpen, setTreatmentFormOpen] = React.useState(false)

  const insurance = insurances?.find((i) => i.id === patient?.insurance_id)

  if (isLoading || !patient) {
    return <p className="p-8 text-center text-muted-foreground">جارٍ التحميل...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate('/patients')}>
        <ArrowRight className="size-4" />
        رجوع لقائمة المرضى
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {patient.full_name[0]}
            </div>
            <div>
              <h2 className="text-lg font-bold">{patient.full_name}</h2>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5" dir="ltr">
                  <Phone className="size-3.5" />
                  {patient.phone}
                </span>
                {patient.email && (
                  <span className="inline-flex items-center gap-1.5" dir="ltr">
                    <Mail className="size-3.5" />
                    {patient.email}
                  </span>
                )}
                {patient.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {patient.address}
                  </span>
                )}
              </div>
              {insurance && (
                <Badge variant="secondary" className="mt-2">
                  <ShieldCheck className="size-3.5" />
                  {insurance.company_name} · تغطية {insurance.coverage_percentage}%
                </Badge>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            تعديل البيانات
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="appointments">المواعيد</TabsTrigger>
          {isClinical && <TabsTrigger value="dental-chart">الخريطة السنية</TabsTrigger>}
          {isClinical && <TabsTrigger value="treatments">العلاجات</TabsTrigger>}
          <TabsTrigger value="billing">الحسابات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2">
              <InfoRow label="تاريخ الميلاد" value={patient.date_of_birth ? formatDate(patient.date_of_birth) : '—'} />
              <InfoRow label="النوع" value={patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : '—'} />
              <InfoRow label="الرقم القومي" value={patient.national_id ?? '—'} />
              <InfoRow label="جهة اتصال الطوارئ" value={patient.emergency_contact_name ?? '—'} />
              <InfoRow label="هاتف الطوارئ" value={patient.emergency_contact_phone ?? '—'} ltr />
              {isClinical && <InfoRow label="الحساسيات" value={patient.allergies ?? '—'} />}
              {isClinical && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">التاريخ المرضي</p>
                  <p className="text-sm">{patient.medical_history ?? '—'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setApptFormOpen(true)}>
              <Plus className="size-4" />
              حجز موعد
            </Button>
          </div>
          <AppointmentsList patientId={patient.id} />
          <AppointmentForm
            open={apptFormOpen}
            onOpenChange={setApptFormOpen}
            presetPatient={patient}
          />
        </TabsContent>

        {isClinical && (
          <TabsContent value="dental-chart">
            <DentalChartView patientId={patient.id} />
          </TabsContent>
        )}

        {isClinical && (
          <TabsContent value="treatments">
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => setTreatmentFormOpen(true)}>
                <Plus className="size-4" />
                تسجيل علاج
              </Button>
            </div>
            <TreatmentsList patientId={patient.id} />
            <TreatmentForm open={treatmentFormOpen} onOpenChange={setTreatmentFormOpen} patientId={patient.id} />
          </TabsContent>
        )}

        <TabsContent value="billing">
          <BillingPanel patientId={patient.id} />
        </TabsContent>
      </Tabs>

      <PatientForm open={editOpen} onOpenChange={setEditOpen} patient={patient} />
    </div>
  )
}

function InfoRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium" dir={ltr ? 'ltr' : undefined}>
        {value}
      </p>
    </div>
  )
}

function AppointmentsList({ patientId }: { patientId: string }) {
  const { data: appointments, isLoading } = usePatientAppointments(patientId)
  if (isLoading) return <p className="text-center text-muted-foreground">جارٍ التحميل...</p>
  if (!appointments?.length) return <p className="py-8 text-center text-muted-foreground">لا توجد مواعيد سابقة</p>

  return (
    <div className="flex flex-col gap-2">
      {appointments.map((appt) => (
        <Card key={appt.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-5">
            <div>
              <p className="font-semibold">
                {formatDate(appt.appointment_date)} · {formatTime(appt.start_time)}
              </p>
              <p className="text-sm text-muted-foreground">
                {appt.doctors?.full_name} · {appt.branches?.name}
                {appt.reason && ` · ${appt.reason}`}
              </p>
            </div>
            <Badge>{appointmentStatusLabels[appt.status]}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TreatmentsList({ patientId }: { patientId: string }) {
  const { data: treatments, isLoading } = useTreatments(patientId)
  if (isLoading) return <p className="text-center text-muted-foreground">جارٍ التحميل...</p>
  if (!treatments?.length) return <p className="py-8 text-center text-muted-foreground">لا توجد علاجات مسجلة</p>

  return (
    <div className="flex flex-col gap-2">
      {treatments.map((t) => (
        <Card key={t.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-5">
            <div>
              <p className="font-semibold">
                {t.procedure_type}
                {t.tooth_number ? ` · سنة رقم ${t.tooth_number}` : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(t.procedure_date)} · {t.doctors?.full_name}
                {t.notes ? ` · ${t.notes}` : ''}
              </p>
            </div>
            <p className="font-semibold">{formatCurrency(Number(t.cost))}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
