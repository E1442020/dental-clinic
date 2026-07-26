import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyTooltip, CountTooltip } from './ChartTooltip'
import { commonProcedures } from '@/features/treatments/api'
import type { TrendPoint } from './api'

const BLUE = 'hsl(217 91% 45%)'
const TEAL = 'hsl(186 72% 40%)'
const GRID = 'hsl(220 15% 88%)'
const AXIS_TEXT = 'hsl(215 16% 47%)'
const MUTED_GRAY = '#898781'

// Fixed categorical order (validated for CVD-safe adjacency) — assigned by a
// stable vocabulary order, never by the current chart's sort, so a given
// procedure keeps its color across every filter/range.
const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
const procedureColor = new Map(commonProcedures.slice(0, CATEGORICAL.length).map((name, i) => [name, CATEGORICAL[i]]))
function colorForProcedure(name: string) {
  return procedureColor.get(name) ?? MUTED_GRAY
}

const axisTickStyle = { fontSize: 11, fill: AXIS_TEXT }
const nameTickStyle = { fontSize: 12, fill: 'hsl(222 47% 20%)', fontWeight: 600 }
const stripDoctorTitle = (name: string) => name.replace(/^د\.\s*/, '')

function EmptyState() {
  return <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">لا توجد بيانات كافية في هذه الفترة</p>
}

export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>الإيرادات</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<CurrencyTooltip />} />
              <Area type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2} fill={BLUE} fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function NewPatientsChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>مرضى جدد</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
              <Tooltip content={<CountTooltip unit="مريض" />} />
              <Area type="monotone" dataKey="value" stroke={TEAL} strokeWidth={2} fill={TEAL} fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function TopProceduresChart({ data }: { data: { name: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>أكثر الخدمات طلبًا</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                stroke="var(--color-card)"
                strokeWidth={2}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={colorForProcedure(d.name)} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]
                  const pct = total > 0 ? Math.round((Number(p.value) / total) * 100) : 0
                  return (
                    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="text-muted-foreground">{p.name}</p>
                      <p className="text-sm font-bold text-foreground">
                        {String(p.value)} مرة · {pct}%
                      </p>
                    </div>
                  )
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function DoctorPerformanceChart({ data }: { data: { name: string; revenue: number }[] }) {
  const sorted = [...data].sort((a, b) => a.revenue - b.revenue)
  return (
    <Card>
      <CardHeader>
        <CardTitle>أداء الأطباء (إيراد العلاجات)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(224, sorted.length * 40)}>
            <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tickFormatter={stripDoctorTitle}
                tick={nameTickStyle}
                axisLine={false}
                tickLine={false}
                width={110}
                interval={0}
              />
              <Tooltip content={<CurrencyTooltip />} cursor={{ fill: 'hsl(186 72% 96%)' }} />
              <Bar dataKey="revenue" fill={TEAL} radius={[0, 4, 4, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
