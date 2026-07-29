import { MessageCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { whatsAppLink } from '@/lib/utils'
import { useClinicSettings } from '@/features/clinic-settings/api'
import { useClinic } from './api'

const SYSTEM_ADMIN_WHATSAPP = '01062677673'

/** Blocks the whole app (every role, not just admin) once the trial has run out or the clinic was
 * disabled — same unclosable-dialog idiom as OnboardingSetup, mounted ahead of it.
 *
 * Trial-expiry blocking only kicks in once onboarding is actually done (clinicSettings exists) —
 * a brand-new signup can never have a real expired trial yet, so this avoids the two gates
 * fighting over the same brief window right after onboarding finishes (clinic/branch queries
 * refetching in response to the just-completed setup) where this could otherwise flash open for
 * an instant. A manually-disabled account still blocks immediately either way, since that's a
 * deliberate action rather than a timing artifact. */
export function TrialGate() {
  const { isExpired, isDisabled, isLoading: clinicLoading } = useClinic()
  // `isPending` (not `isLoading`) — see the note on useClinic() in features/clinics/api.ts.
  const { data: clinicSettings, isPending: settingsLoading } = useClinicSettings()

  if (clinicLoading || settingsLoading) return null
  const onboardingDone = !!clinicSettings
  const shouldBlock = isDisabled || (onboardingDone && isExpired)
  if (!shouldBlock) return null

  const message = 'أهلاً، عايزة أجدد الاشتراك في نظام إدارة العيادة'

  return (
    <Dialog open>
      <DialogContent
        showClose={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isDisabled ? 'الحساب متوقف مؤقتًا' : 'انتهت الفترة التجريبية'}</DialogTitle>
          <DialogDescription>
            {isDisabled
              ? 'تواصلي مع مسؤول النظام لمعرفة السبب أو إعادة تفعيل الحساب'
              : 'للتجديد ومتابعة استخدام النظام، تواصلي مع مسؤول النظام'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button asChild>
            <a href={whatsAppLink(SYSTEM_ADMIN_WHATSAPP, message)} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" />
              تواصل مع مسؤول النظام
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
