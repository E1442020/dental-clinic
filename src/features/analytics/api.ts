import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type RangeKey = '7d' | '30d' | '90d' | 'year'

export const rangeOptions: { key: RangeKey; label: string }[] = [
  { key: '7d', label: 'آخر 7 أيام' },
  { key: '30d', label: 'آخر 30 يوم' },
  { key: '90d', label: 'آخر 3 شهور' },
  { key: 'year', label: 'هذا العام' },
]

function rangeToDates(range: RangeKey) {
  const to = new Date()
  const from = new Date()
  if (range === '7d') from.setDate(to.getDate() - 6)
  else if (range === '30d') from.setDate(to.getDate() - 29)
  else if (range === '90d') from.setDate(to.getDate() - 89)
  else from.setMonth(0, 1)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

/** Daily buckets for short ranges, weekly for 90d, monthly for the full year. */
function bucketKeyFor(range: RangeKey, isoDate: string) {
  const d = new Date(isoDate)
  if (range === 'year') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  if (range === '90d') {
    const firstDay = new Date(d.getFullYear(), 0, 1)
    const week = Math.ceil(((d.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${week}`
  }
  return isoDate
}

function bucketLabel(range: RangeKey, key: string) {
  if (range === 'year') {
    const [, month] = key.split('-')
    return new Intl.DateTimeFormat('ar-EG', { month: 'short', numberingSystem: 'latn' }).format(
      new Date(2000, Number(month) - 1, 1),
    )
  }
  if (range === '90d') return key.split('-W')[1] ? `أسبوع ${key.split('-W')[1]}` : key
  const d = new Date(key)
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'numeric', numberingSystem: 'latn' }).format(d)
}

export interface TrendPoint {
  key: string
  label: string
  value: number
}

export interface AnalyticsData {
  revenueTrend: TrendPoint[]
  newPatientsTrend: TrendPoint[]
  topProcedures: { name: string; count: number }[]
  doctorPerformance: { name: string; revenue: number }[]
}

export function useAnalytics(range: RangeKey, branchId?: string) {
  return useQuery({
    queryKey: ['analytics', range, branchId ?? 'all'],
    queryFn: async (): Promise<AnalyticsData> => {
      const { from, to } = rangeToDates(range)

      let treatmentsQuery = supabase
        .from('treatments')
        .select('procedure_type, cost, procedure_date, doctors(full_name)')
        .gte('procedure_date', from)
        .lte('procedure_date', to)
      if (branchId) treatmentsQuery = treatmentsQuery.eq('branch_id', branchId)

      let patientsQuery = supabase
        .from('patients')
        .select('created_at')
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59')
      if (branchId) patientsQuery = patientsQuery.eq('primary_branch_id', branchId)

      const [treatmentsRes, patientsRes] = await Promise.all([treatmentsQuery, patientsQuery])
      if (treatmentsRes.error) throw treatmentsRes.error
      if (patientsRes.error) throw patientsRes.error

      const treatments = treatmentsRes.data as unknown as {
        procedure_type: string
        cost: number
        procedure_date: string
        doctors: { full_name: string } | null
      }[]

      // revenue trend
      const revenueMap = new Map<string, number>()
      for (const t of treatments) {
        const key = bucketKeyFor(range, t.procedure_date)
        revenueMap.set(key, (revenueMap.get(key) ?? 0) + Number(t.cost))
      }
      const revenueTrend = Array.from(revenueMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({ key, label: bucketLabel(range, key), value }))

      // new patients trend
      const patientsMap = new Map<string, number>()
      for (const p of patientsRes.data ?? []) {
        const key = bucketKeyFor(range, p.created_at.slice(0, 10))
        patientsMap.set(key, (patientsMap.get(key) ?? 0) + 1)
      }
      const newPatientsTrend = Array.from(patientsMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({ key, label: bucketLabel(range, key), value }))

      // top procedures
      const procMap = new Map<string, number>()
      for (const t of treatments) {
        procMap.set(t.procedure_type, (procMap.get(t.procedure_type) ?? 0) + 1)
      }
      const sortedProcs = Array.from(procMap.entries()).sort(([, a], [, b]) => b - a)
      const topProcedures = sortedProcs.slice(0, 7).map(([name, count]) => ({ name, count }))
      if (sortedProcs.length > 7) {
        const otherCount = sortedProcs.slice(7).reduce((s, [, c]) => s + c, 0)
        topProcedures.push({ name: 'أخرى', count: otherCount })
      }

      // doctor performance
      const doctorMap = new Map<string, number>()
      for (const t of treatments) {
        const name = t.doctors?.full_name ?? 'غير محدد'
        doctorMap.set(name, (doctorMap.get(name) ?? 0) + Number(t.cost))
      }
      const doctorPerformance = Array.from(doctorMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, revenue]) => ({ name, revenue }))

      return { revenueTrend, newPatientsTrend, topProcedures, doctorPerformance }
    },
  })
}
