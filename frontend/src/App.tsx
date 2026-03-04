import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { UserDashboard } from '@/pages/UserDashboard'
import { DoctorDashboard } from '@/pages/DoctorDashboard'
import { Diagnosis } from '@/pages/Diagnosis'
import { ConsultationView } from '@/components/ConsultationView'
import { useAuthInit } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

function AuthRedirect() {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated && user) return <Navigate to={`/dashboard/${user.role}`} replace />
  return <Navigate to="/" replace />
}

export default function App() {
  // Validate token on mount
  useAuthInit()

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected: User */}
        <Route
          path="/dashboard/user"
          element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diagnose"
          element={
            <ProtectedRoute requiredRole="user">
              <Diagnosis />
            </ProtectedRoute>
          }
        />

        {/* Protected: Doctor */}
        <Route
          path="/dashboard/doctor"
          element={
            <ProtectedRoute requiredRole="doctor">
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected: Consultation (any authenticated role) */}
        <Route
          path="/consultation/:id"
          element={
            <ProtectedRoute>
              <ConsultationView />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="/dashboard" element={<AuthRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
