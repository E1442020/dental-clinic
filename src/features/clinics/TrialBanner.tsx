import { Clock, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { whatsAppLink } from '@/lib/utils'
import { useClinic } from './api'

const SYSTEM_ADMIN_WHATSAPP = '01062677673'

/** Small persistent top bar shown for the whole trial period — not just near
 * expiry — so the admin always knows how long is left and how to renew. */
export function TrialBanner() {
  const { trialEndsAt, daysRemaining, isExpired } = useClinic()

  if (!trialEndsAt || isExpired) return null

  const message = 'أهلاً، عايزة أجدد الاشتراك في نظام إدارة العيادة'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/20 bg-warning/10 px-4 py-2.5 sm:px-6">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Clock className="size-4" />
        </div>
        <p className="text-sm">
          <span className="font-bold text-warning">{daysRemaining}</span>{' '}
          <span className="font-medium">{daysRemaining === 1 ? 'يوم متبقي' : 'أيام متبقية'} على انتهاء الفترة التجريبية</span>
        </p>
      </div>
      <Button size="sm" variant="outline" className="border-warning/30 bg-card hover:bg-warning/10" asChild>
        <a href={whatsAppLink(SYSTEM_ADMIN_WHATSAPP, message)} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" />
          للتجديد: تواصل مع مسؤول النظام
        </a>
      </Button>
    </div>
  )
}
