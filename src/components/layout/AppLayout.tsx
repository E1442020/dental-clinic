import * as React from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileSidebar } from './MobileSidebar'
import { Topbar } from './Topbar'
import { BranchProvider } from '@/features/branches/BranchContext'
import { OnboardingSetup } from '@/features/clinic-settings/OnboardingSetup'

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const matches = useMatches()
  const current = matches.at(-1)
  const title = (current?.handle as { title?: string } | undefined)?.title ?? 'لوحة التحكم'

  return (
    <BranchProvider>
      <OnboardingSetup />
      <div className="flex h-svh overflow-hidden bg-background">
        <Sidebar />
        <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setMobileNavOpen(true)} title={title} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
            <React.Suspense fallback={<p className="text-center text-muted-foreground">جارٍ التحميل...</p>}>
              <Outlet />
            </React.Suspense>
          </main>
        </div>
      </div>
    </BranchProvider>
  )
}
