import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BranchSwitcher } from './BranchSwitcher'

export function Topbar({ onMenuClick, title }: { onMenuClick: () => void; title: string }) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="size-5" />
        </Button>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>

      <BranchSwitcher />
    </header>
  )
}
