/** Matches JS Date#getDay(): 0 = Sunday ... 6 = Saturday */
export const weekdays = [
  { code: 'sun', label: 'الأحد' },
  { code: 'mon', label: 'الاثنين' },
  { code: 'tue', label: 'الثلاثاء' },
  { code: 'wed', label: 'الأربعاء' },
  { code: 'thu', label: 'الخميس' },
  { code: 'fri', label: 'الجمعة' },
  { code: 'sat', label: 'السبت' },
] as const

export function weekdayCodeForDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return weekdays[new Date(year, month - 1, day).getDay()].code
}
