import * as React from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useBranches, useUserBranchIds } from './api'
import type { Branch } from '@/types/database'

const STORAGE_KEY = 'clinic:current-branch-id'

interface BranchContextValue {
  currentBranchId: string | undefined
  setCurrentBranchId: (id: string) => void
  currentBranch: Branch | undefined
  /** The branches this user can actually operate in — every branch for admin/accountant,
   * otherwise just the ones they're assigned to via user_branches. */
  branches: Branch[]
  /** true when the user can only work in one branch (or none) and so can't switch */
  isLocked: boolean
  isLoading: boolean
}

const BranchContext = React.createContext<BranchContextValue | undefined>(undefined)

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const { data: allBranches = [], isLoading: loadingBranches } = useBranches()
  const isUnrestricted = profile?.role === 'admin' || profile?.role === 'accountant'
  const { data: assignedBranchIds, isLoading: loadingAssigned } = useUserBranchIds(
    isUnrestricted ? undefined : profile?.id,
  )
  const [selectedId, setSelectedId] = React.useState<string | undefined>(
    () => localStorage.getItem(STORAGE_KEY) ?? undefined,
  )

  const branches = React.useMemo(() => {
    if (isUnrestricted) return allBranches
    const assigned = new Set(assignedBranchIds ?? [])
    return allBranches.filter((b) => assigned.has(b.id))
  }, [isUnrestricted, allBranches, assignedBranchIds])

  const isLoading = loadingBranches || (!isUnrestricted && loadingAssigned)
  const isLocked = !isUnrestricted && branches.length <= 1

  const currentBranchId = React.useMemo(() => {
    if (isLocked) return branches[0]?.id
    if (selectedId && branches.some((b) => b.id === selectedId)) return selectedId
    return branches[0]?.id
  }, [isLocked, selectedId, branches])

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
