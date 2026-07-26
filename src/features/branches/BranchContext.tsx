import * as React from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useBranches } from './api'
import type { Branch } from '@/types/database'

const STORAGE_KEY = 'clinic:current-branch-id'

interface BranchContextValue {
  currentBranchId: string | undefined
  setCurrentBranchId: (id: string) => void
  currentBranch: Branch | undefined
  branches: Branch[]
  /** true when the user's role is pinned to one branch (e.g. receptionist) and can't switch */
  isLocked: boolean
  isLoading: boolean
}

const BranchContext = React.createContext<BranchContextValue | undefined>(undefined)

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const { data: branches = [], isLoading } = useBranches()
  const [selectedId, setSelectedId] = React.useState<string | undefined>(
    () => localStorage.getItem(STORAGE_KEY) ?? undefined,
  )

  const isLocked = !!profile?.branch_id

  const currentBranchId = React.useMemo(() => {
    if (isLocked) return profile!.branch_id!
    if (selectedId && branches.some((b) => b.id === selectedId)) return selectedId
    return branches[0]?.id
  }, [isLocked, profile, selectedId, branches])

  function setCurrentBranchId(id: string) {
    setSelectedId(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const currentBranch = branches.find((b) => b.id === currentBranchId)

  return (
    <BranchContext.Provider
      value={{ currentBranchId, setCurrentBranchId, currentBranch, branches, isLocked, isLoading }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranchContext() {
  const ctx = React.useContext(BranchContext)
  if (!ctx) throw new Error('useBranchContext must be used within BranchProvider')
  return ctx
}
