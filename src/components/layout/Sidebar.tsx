import { NavLink } from 'react-router-dom'
import { Stethoscope, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { useClinicSettings } from '@/features/clinic-settings/api'
import { navItems } from './navItems'
import { UserAccountMenu } from './UserAccountMenu'

export function Sidebar() {
  const { profile } = useAuth()
  const { data: clinicSettings } = useClinicSettings()
  const role = profile?.role

  const items = navItems.filter((item) => !item.roles || (role && item.roles.includes(role)))

  return (
    <aside className="hidden w-64 shrink-0 border-e border-border bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Stethoscope className="size-5" />
        </div>
        <span className="truncate font-bold">{clinicSettings?.name ?? 'عيادة الأسنان'}</span>
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
        {profile?.is_super_admin && (
          <NavLink
            to="/super-admin"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              )
            }
          >
            <ShieldAlert className="size-4" />
            إدارة العيادات
          </NavLink>
        )}
      </nav>
      <UserAccountMenu />
    </aside>
  )
}
