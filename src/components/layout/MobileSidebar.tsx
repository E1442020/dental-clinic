import * as DialogPrimitive from '@radix-ui/react-dialog'
import { NavLink } from 'react-router-dom'
import { X, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import type { UserRole } from '@/types/database'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Building2,
  ShieldCheck,
  Receipt,
} from 'lucide-react'

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

export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profile } = useAuth()
  const role = profile?.role
  const items = navItems.filter((item) => !item.roles || (role && item.roles.includes(role)))

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 md:hidden" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 start-0 z-50 flex w-72 flex-col bg-card shadow-xl md:hidden',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
          )}
        >
          <DialogPrimitive.Title className="sr-only">القائمة</DialogPrimitive.Title>
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Stethoscope className="size-5" />
              </div>
              <span className="font-bold">عيادة الأسنان</span>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1.5 hover:bg-accent">
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => onOpenChange(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground',
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
