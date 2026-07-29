import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(date))
}

/** "YYYY-MM-DD" for the LOCAL calendar day — never use `date.toISOString().slice(0, 10)` for
 * this, since that reads the UTC date. Egypt (and most timezones ahead of UTC) would then show
 * yesterday's date for the first couple of hours after local midnight, right until UTC catches
 * up — exactly the "date doesn't roll over after midnight" bug this fixes. */
export function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatTime(time: string) {
  const [h, m] = time.split(':')
  const d = new Date()
  d.setHours(Number(h), Number(m))
  return new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).format(d)
}

/** wa.me needs the full international number with no leading zero — Egyptian numbers are stored locally (e.g. "01012345678"). */
function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return `20${digits.slice(1)}`
  if (digits.startsWith('20')) return digits
  return digits
}

/** Opens a wa.me chat pre-filled with `message` for the given local phone number. */
export function whatsAppLink(phone: string, message: string) {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`
}
