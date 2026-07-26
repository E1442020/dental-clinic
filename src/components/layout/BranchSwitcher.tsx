import { Building2, Check, ChevronDown } from 'lucide-react'
import { useBranchContext } from '@/features/branches/BranchContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function BranchSwitcher() {
  const { currentBranch, currentBranchId, setCurrentBranchId, branches, isLocked, isLoading } = useBranchContext()

  if (isLoading) return null

  if (isLocked) {
    return (
      <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-sm font-medium text-muted-foreground sm:flex">
        <Building2 className="size-4" />
        {currentBranch?.name ?? '—'}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent sm:flex">
          <Building2 className="size-4 text-primary" />
          {currentBranch?.name ?? 'اختر الفرع'}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>أنت تعمل الآن على فرع</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => setCurrentBranchId(b.id)}>
            {b.id === currentBranchId && <Check className="size-4" />}
            {b.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
