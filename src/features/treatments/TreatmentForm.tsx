import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useBranchContext } from '@/features/branches/BranchContext'
import { TreatmentFormFields } from './TreatmentFormFields'

export function TreatmentForm({
  open,
  onOpenChange,
  patientId,
  defaultTooth,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  defaultTooth?: number
}) {
  const { currentBranch } = useBranchContext()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل علاج جديد</DialogTitle>
          <DialogDescription>
            {currentBranch ? `فرع ${currentBranch.name} · ` : ''}
            سيتم تحديث الخريطة السنية تلقائيًا حسب نوع الإجراء
          </DialogDescription>
        </DialogHeader>

        {open && (
          <TreatmentFormFields
            patientId={patientId}
            defaultTooth={defaultTooth}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
