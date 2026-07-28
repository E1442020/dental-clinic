import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useBranchContext } from '@/features/branches/BranchContext'
import { TreatmentFormFields } from './TreatmentFormFields'
import type { TreatmentWithDoctor } from './api'

export function TreatmentForm({
  open,
  onOpenChange,
  patientId,
  defaultTooth,
  treatment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  defaultTooth?: number
  treatment?: TreatmentWithDoctor
}) {
  const { currentBranch } = useBranchContext()
  const isEdit = !!treatment

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل العلاج' : 'تسجيل علاج جديد'}</DialogTitle>
          <DialogDescription>
            {currentBranch ? `فرع ${currentBranch.name} · ` : ''}
            سيتم تحديث الخريطة السنية تلقائيًا حسب نوع الإجراء
          </DialogDescription>
        </DialogHeader>

        {open && (
          <TreatmentFormFields
            patientId={patientId}
            defaultTooth={defaultTooth}
            treatment={treatment}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
