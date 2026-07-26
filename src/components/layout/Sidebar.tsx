import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Building2,
  ShieldCheck,
  Receipt,
  Stethoscope,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import type { UserRole } from '@/types/database'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles?: UserRole[]
}

const navItems: NavItem[] = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/patients', label: 'المرضى', icon: Users },
  { to: '/appointments', label: 'المواعيد', icon: CalendarDays },
  { to: '/doctors', label: 'الأطباء', icon: Stethoscope, roles: ['admin'] },
  { to: '/branches', label: 'الفروع', icon: Building2, roles: ['admin'] },
  { to: '/insurance', label: 'شركات التأمين', icon: ShieldCheck, roles: ['admin', 'receptionist', 'accountant'] },
  { to: '/billing', label: 'الحسابات والفواتير', icon: Receipt, roles: ['admin', 'accountant', 'receptionist'] },
]

export function Sidebar() {
  const { profile } = useAuth()
  const role = profile?.role

  const items = navItems.filter((item) => !item.roles || (role && item.roles.includes(role)))

  return (
    <aside className="hidden w-64 shrink-0 border-e border-border bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Stethoscope className="size-5" />
        </div>
        <span className="font-bold">عيادة الأسنان</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
