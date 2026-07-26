import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { UserRole } from '@/types/database'

export function ProtectedRoute({
  children,
  allow,
}: {
  children: React.ReactNode
  allow?: UserRole[]
}) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-svh items-center justify-center text-muted-foreground">
        جارٍ التحميل...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (allow && profile && !allow.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
