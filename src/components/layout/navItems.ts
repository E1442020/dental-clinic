import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Building2,
  ShieldCheck,
  Receipt,
  Stethoscope,
  UserCog,
} from 'lucide-react'
import type { UserRole } from '@/types/database'

export interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles?: UserRole[]
}

/** Single source for both Sidebar (desktop) and MobileSidebar — keeping one list means the two
 * can't silently drift out of sync the way they did before (mobile was a hand-copied duplicate). */
export const navItems: NavItem[] = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/patients', label: 'المرضى', icon: Users },
  { to: '/appointments', label: 'المواعيد', icon: CalendarDays },
  { to: '/doctors', label: 'الأطباء', icon: Stethoscope, roles: ['admin'] },
  { to: '/branches', label: 'الفروع', icon: Building2, roles: ['admin'] },
  { to: '/insurance', label: 'شركات التأمين', icon: ShieldCheck, roles: ['admin', 'receptionist', 'accountant'] },
  { to: '/billing', label: 'الحسابات والفواتير', icon: Receipt, roles: ['admin', 'accountant', 'receptionist'] },
  { to: '/staff', label: 'الموظفون', icon: UserCog, roles: ['admin'] },
]
