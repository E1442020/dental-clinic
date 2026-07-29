import * as React from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { weekdays, weekdayCodeForDate } from '@/lib/weekdays'
import { cn, toISODate } from '@/lib/utils'
import { useToday } from '@/hooks/use-today'

/** How many days are generated on each side of the anchor — wide enough that
 * a couple of arrow clicks in a row never has to jump/regenerate mid-scroll. */
const STRIP_HALF = 10

function addDays(iso: string, delta: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

/**
 * A horizontally-scrolling strip of day cards (2 visible before/after the
 * selected day by default). Arrows and clicks move the selection; the strip
 * glides there with the browser's native smooth scroll instead of snapping.
 */
export function DateStrip({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const todayIso = useToday()
  const [anchor, setAnchor] = React.useState(date)
  const itemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})

  // Keep the window centered-ish on the selection; only regenerate (jump) once
  // it drifts near the edge, so normal arrow clicks just glide smoothly.
  React.useEffect(() => {
    const diffDays = Math.round((new Date(date).getTime() - new Date(anchor).getTime()) / 86400000)
    if (Math.abs(diffDays) > STRIP_HALF - 2) setAnchor(date)
  }, [date, anchor])

  const days = React.useMemo(
    () => Array.from({ length: STRIP_HALF * 2 + 1 }, (_, i) => addDays(anchor, i - STRIP_HALF)),
    [anchor],
  )

  React.useEffect(() => {
    itemRefs.current[date]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [date, days])

  function shift(delta: number) {
    onChange(addDays(date, delta))
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="shrink-0" onClick={() => shift(-1)}>
        <ChevronRight className="size-4" />
      </Button>

      <div className="scrollbar-none flex w-72 gap-2 overflow-x-auto scroll-smooth py-1 sm:w-80">
        {days.map((d) => {
          const isSelected = d === date
          const isToday = d === todayIso
          const label = weekdays.find((w) => w.code === weekdayCodeForDate(d))?.label ?? ''

          return (
            <button
              key={d}
              ref={(el) => {
                itemRefs.current[d] = el
              }}
              type="button"
              onClick={() => onChange(d)}
              className={cn(
                'flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-1.5 transition-all',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
              style={{ scrollSnapAlign: 'center' }}
            >
              <span className={cn('font-semibold', isSelected ? 'text-xs' : 'text-[11px]')}>{label}</span>
              <span className={cn('font-bold', isSelected ? 'text-base' : 'text-sm')}>
                {new Date(d).getDate()}
              </span>
              {isToday && !isSelected && <span className="text-[9px] leading-none text-primary">اليوم</span>}
            </button>
          )
        })}
      </div>

      <Button variant="outline" size="icon" className="shrink-0" onClick={() => shift(1)}>
        <ChevronLeft className="size-4" />
      </Button>
    </div>
  )
}
