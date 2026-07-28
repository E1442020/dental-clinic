import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useCreateTreatment,
  useUpdateTreatment,
  useUploadTreatmentPhoto,
  useDeleteTreatmentPhoto,
  useTreatmentPhotoUrl,
  commonProcedures,
} from './api'
import type { TreatmentWithDoctor } from './api'
import { useInvoiceByTreatment, useUpdateInvoiceCost, useCreateInvoice } from '@/features/billing/api'
import { useDoctorsForBranch } from '@/features/appointments/api'
import { useBranchContext } from '@/features/branches/BranchContext'
import { useAuth } from '@/features/auth/AuthProvider'
import { toast } from '@/hooks/use-toast'
import { toothOptions } from '@/features/dental-chart/toothLabels'

const schema = z.object({
  doctor_id: z.string().min(1, 'اختر الدكتور'),
  tooth_number: z.string().optional(),
  procedure_type: z.string().min(1, 'اختر نوع الإجراء'),
  procedure_date: z.string().min(1),
  cost: z.string().min(1, 'أدخل التكلفة').refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'أدخل رقمًا صحيحًا'),
  notes: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

/** Existing uploaded photo, with a delete button — distinct from the read-only TreatmentPhotos
 * used in the treatments list, which has no destructive action. */
function ExistingPhotoThumbnail({
  path,
  label,
  onDelete,
  deleting,
}: {
  path: string
  label: string
  onDelete: () => void
  deleting: boolean
}) {
  const { data: url } = useTreatmentPhotoUrl(path)

  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border">
      {url ? (
        <img src={url} alt={label} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">{label}</div>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] font-semibold text-white">
        {label}
      </span>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        title="حذف الصورة"
        className="absolute end-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-white disabled:opacity-50"
      >
        <X className="size-2.5" />
      </button>
    </div>
  )
}

/** A locally chosen (not-yet-uploaded) file, with a button to clear the selection before saving. */
function PendingFileField({
  id,
  label,
  file,
  inputRef,
  onChoose,
  onClear,
}: {
  id: string
  label: string
  file: File | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onChoose: (file: File | null) => void
  onClear: () => void
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          ref={inputRef}
          type="file"
          accept="image/*"
          className="file:me-2 file:rounded-sm file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs file:font-semibold"
          onChange={(e) => onChoose(e.target.files?.[0] ?? null)}
        />
        {file && (
          <button
            type="button"
            onClick={onClear}
            title="إلغاء اختيار الصورة"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export function TreatmentFormFields({
  patientId,
  defaultTooth,
  treatment,
  onSaved,
  onCancel,
}: {
  patientId: string
  defaultTooth?: number
  /** When set, the form edits this existing treatment instead of creating a new one — used to
   * add the "after" photo once it's ready, or fix any other detail after the fact. */
  treatment?: TreatmentWithDoctor
  onSaved: () => void
  onCancel?: () => void
}) {
  const isEdit = !!treatment
  const { currentBranchId } = useBranchContext()
  const branchId = treatment?.branch_id ?? currentBranchId
  const { data: doctors } = useDoctorsForBranch(branchId)
  const { profile } = useAuth()
  const createTreatment = useCreateTreatment()
  const updateTreatment = useUpdateTreatment()
  const uploadPhoto = useUploadTreatmentPhoto()
  const deletePhoto = useDeleteTreatmentPhoto()
  const { data: linkedInvoice } = useInvoiceByTreatment(treatment?.id)
  const updateInvoiceCost = useUpdateInvoiceCost()
  const createInvoice = useCreateInvoice()

  const [beforeFile, setBeforeFile] = React.useState<File | null>(null)
  const [afterFile, setAfterFile] = React.useState<File | null>(null)
  const [uploadingPhotos, setUploadingPhotos] = React.useState(false)
  const [deletingKind, setDeletingKind] = React.useState<'before' | 'after' | null>(null)
  const [currentBeforeUrl, setCurrentBeforeUrl] = React.useState(treatment?.before_image_url ?? null)
  const [currentAfterUrl, setCurrentAfterUrl] = React.useState(treatment?.after_image_url ?? null)
  const beforeInputRef = React.useRef<HTMLInputElement>(null)
  const afterInputRef = React.useRef<HTMLInputElement>(null)

  // Only meaningful once an invoice exists to protect: an invoice that's still 'unpaid' has had
  // no payment or insurance amount recorded against it yet, so its total is safe to recompute.
  const costLocked = isEdit && !!linkedInvoice && linkedInvoice.status !== 'unpaid'

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: treatment
      ? {
          doctor_id: treatment.doctor_id,
          tooth_number: treatment.tooth_number ? String(treatment.tooth_number) : 'all',
          procedure_type: treatment.procedure_type,
          procedure_date: treatment.procedure_date,
          cost: String(treatment.cost),
          notes: treatment.notes ?? '',
        }
      : {
          doctor_id: profile?.role === 'doctor' ? (profile.linked_doctor_id ?? '') : '',
          tooth_number: defaultTooth ? String(defaultTooth) : 'all',
          procedure_date: new Date().toISOString().slice(0, 10),
          cost: '',
        },
  })

  function clearBeforeFile() {
    setBeforeFile(null)
    if (beforeInputRef.current) beforeInputRef.current.value = ''
  }

  function clearAfterFile() {
    setAfterFile(null)
    if (afterInputRef.current) afterInputRef.current.value = ''
  }

  async function handleDeletePhoto(kind: 'before' | 'after') {
    if (!treatment) return
    const path = kind === 'before' ? currentBeforeUrl : currentAfterUrl
    if (!path) return
    setDeletingKind(kind)
    try {
      await deletePhoto.mutateAsync({ treatmentId: treatment.id, patientId, kind, path })
      if (kind === 'before') setCurrentBeforeUrl(null)
      else setCurrentAfterUrl(null)
      toast({ title: 'تم حذف الصورة', variant: 'success' })
    } catch (err) {
      toast({ title: 'تعذّر حذف الصورة', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setDeletingKind(null)
    }
  }

  async function onSubmit(values: FormValues) {
    if (!branchId) {
      toast({ title: 'لازم تضيف فرع أولًا من صفحة الفروع', variant: 'destructive' })
      return
    }
    try {
      const newCost = Number(values.cost)
      const input = {
        patient_id: patientId,
        doctor_id: values.doctor_id,
        branch_id: branchId,
        tooth_number: values.tooth_number && values.tooth_number !== 'all' ? Number(values.tooth_number) : null,
        procedure_type: values.procedure_type,
        procedure_date: values.procedure_date,
        cost: newCost,
        notes: values.notes || null,
      }
      const savedTreatment = isEdit
        ? await updateTreatment.mutateAsync({ id: treatment.id, ...input })
        : await createTreatment.mutateAsync(input)

      if (isEdit && !costLocked) {
        if (linkedInvoice && newCost !== Number(linkedInvoice.total_amount)) {
          await updateInvoiceCost.mutateAsync({
            invoiceId: linkedInvoice.id,
            newTotalAmount: newCost,
            insuranceCoveredAmount: Number(linkedInvoice.insurance_covered_amount),
          })
        } else if (!linkedInvoice && newCost > 0) {
          await createInvoice.mutateAsync({
            patient_id: patientId,
            branch_id: branchId,
            treatment_id: treatment.id,
            total_amount: newCost,
            insurance_covered_amount: 0,
          })
        }
      }

      if (beforeFile || afterFile) {
        setUploadingPhotos(true)
        try {
          if (beforeFile) {
            await uploadPhoto.mutateAsync({
              treatmentId: savedTreatment.id,
              patientId,
              kind: 'before',
              file: beforeFile,
            })
          }
          if (afterFile) {
            await uploadPhoto.mutateAsync({ treatmentId: savedTreatment.id, patientId, kind: 'after', file: afterFile })
          }
        } catch (err) {
          toast({ title: 'العلاج اتسجل لكن رفع الصور فشل', description: (err as Error).message, variant: 'destructive' })
          onSaved()
          return
        } finally {
          setUploadingPhotos(false)
        }
      }

      toast({ title: isEdit ? 'تم تحديث العلاج' : 'تم تسجيل العلاج بنجاح', variant: 'success' })
      onSaved()
    } catch (err) {
      toast({
        title: isEdit ? 'تعذّر تحديث العلاج' : 'تعذّر تسجيل العلاج',
        description: (err as Error).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>الدكتور</Label>
          <Select value={watch('doctor_id')} onValueChange={(v) => setValue('doctor_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الدكتور" />
            </SelectTrigger>
            <SelectContent>
              {doctors?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.doctor_id && <p className="mt-1 text-xs text-destructive">{errors.doctor_id.message}</p>}
        </div>
        <div>
          <Label>السنة (اختياري)</Label>
          <Select value={watch('tooth_number')} onValueChange={(v) => setValue('tooth_number', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأسنان (بدون سنة محددة)</SelectItem>
              {toothOptions.map((t) => (
                <SelectItem key={t.value} value={String(t.value)}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>نوع الإجراء</Label>
        <Select value={watch('procedure_type')} onValueChange={(v) => setValue('procedure_type', v)}>
          <SelectTrigger>
            <SelectValue placeholder="اختر الإجراء" />
          </SelectTrigger>
          <SelectContent>
            {commonProcedures.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.procedure_type && <p className="mt-1 text-xs text-destructive">{errors.procedure_type.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="procedure_date">تاريخ الإجراء</Label>
          <Input id="procedure_date" type="date" {...register('procedure_date')} />
        </div>
        <div>
          <Label htmlFor="cost">التكلفة</Label>
          <Input id="cost" type="number" min={0} step="0.01" disabled={costLocked} {...register('cost')} />
          {errors.cost && <p className="mt-1 text-xs text-destructive">{errors.cost.message}</p>}
          {isEdit &&
            (costLocked ? (
              <p className="mt-1 text-xs text-muted-foreground">
                التكلفة مقفولة لإن فيه دفعة أو تغطية تأمين اتسجلت على الفاتورة دي بالفعل — لو محتاجة تتغيّر، عدّليها
                يدويًا من تاب الحسابات
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                لسه مفيش أي دفعات على الفاتورة دي، فأي تعديل هنا هيتحدث تلقائيًا في الحسابات
              </p>
            ))}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">ملاحظات</Label>
        <textarea
          id="notes"
          rows={2}
          {...register('notes')}
          className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {isEdit && (currentBeforeUrl || currentAfterUrl) && (
        <div>
          <Label>الصور الحالية</Label>
          <div className="mt-1 flex gap-2">
            {currentBeforeUrl && (
              <ExistingPhotoThumbnail
                path={currentBeforeUrl}
                label="قبل"
                onDelete={() => handleDeletePhoto('before')}
                deleting={deletingKind === 'before'}
              />
            )}
            {currentAfterUrl && (
              <ExistingPhotoThumbnail
                path={currentAfterUrl}
                label="بعد"
                onDelete={() => handleDeletePhoto('after')}
                deleting={deletingKind === 'after'}
              />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <PendingFileField
          id="before_image"
          label={currentBeforeUrl ? 'استبدال صورة قبل العلاج' : 'صورة قبل العلاج (اختياري)'}
          file={beforeFile}
          inputRef={beforeInputRef}
          onChoose={setBeforeFile}
          onClear={clearBeforeFile}
        />
        <PendingFileField
          id="after_image"
          label={currentAfterUrl ? 'استبدال صورة بعد العلاج' : 'صورة بعد العلاج (اختياري)'}
          file={afterFile}
          inputRef={afterInputRef}
          onChoose={setAfterFile}
          onClear={clearAfterFile}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || uploadingPhotos}>
          {uploadingPhotos ? 'جارٍ رفع الصور...' : isSubmitting ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'حفظ العلاج'}
        </Button>
      </div>
    </form>
  )
}
