import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { CircleUniqueLoad } from '@/components/ui/circle-unique-load'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'user' | 'doctor'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircleUniqueLoad size="lg" label="Authenticating…" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Wrong role → send to their correct dashboard
    return <Navigate to={`/dashboard/${user?.role}`} replace />
  }

  return <>{children}</>
}
