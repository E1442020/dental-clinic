import * as React from 'react'
import { toISODate } from '@/lib/utils'

/** Live-updating "today" (local calendar day, YYYY-MM-DD) that automatically flips to the new
 * day at local midnight — unlike a one-time `toISODate(new Date())` computed at mount/render
 * time, which goes stale if the tab is left open overnight and never touched again. */
export function useToday(): string {
  const [today, setToday] = React.useState(() => toISODate(new Date()))

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    function scheduleNextMidnight() {
      const now = new Date()
      // A few seconds past midnight, so we don't fire a hair early and re-read the old day.
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
      timeoutId = setTimeout(() => {
        setToday(toISODate(new Date()))
        scheduleNextMidnight()
      }, nextMidnight.getTime() - now.getTime())
    }

    scheduleNextMidnight()
    return () => clearTimeout(timeoutId)
  }, [])

  return today
}
