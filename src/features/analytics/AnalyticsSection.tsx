import * as React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAnalytics, rangeOptions, type RangeKey } from './api'
import { RevenueTrendChart, NewPatientsChart, TopProceduresChart, DoctorPerformanceChart } from './Charts'

export default function AnalyticsSection() {
  const [range, setRange] = React.useState<RangeKey>('30d')
  const { data, isFetching } = useAnalytics(range)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">تحليلات العيادة</h2>
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rangeOptions.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RevenueTrendChart data={data?.revenueTrend ?? []} />
          <NewPatientsChart data={data?.newPatientsTrend ?? []} />
          <TopProceduresChart data={data?.topProcedures ?? []} />
          <DoctorPerformanceChart data={data?.doctorPerformance ?? []} />
        </div>
      </div>
    </div>
  )
}
