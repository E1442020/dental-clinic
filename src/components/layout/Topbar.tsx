import { LogOut, Menu, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { roleLabels } from '@/lib/roles'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { BranchSwitcher } from './BranchSwitcher'

export function Topbar({ onMenuClick, title }: { onMenuClick: () => void; title: string }) {
  const { profile, signOut } = useAuth()
  const initials = profile?.full_name?.trim()?.[0] ?? '؟'

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="size-5" />
        </Button>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <BranchSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-accent">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-start sm:block">
                <p className="text-sm font-semibold leading-tight">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {profile ? roleLabels[profile.role] : ''}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="size-4" />
              الملف الشخصي
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => signOut()}>
              <LogOut className="size-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
