import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/lib/api'

/**
 * Validates the stored token on mount by calling /auth/me.
 * If the token is invalid or expired, clears auth state.
 */
export function useAuthInit() {
  const { token, setAuth, clearAuth, setLoading } = useAuthStore()

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    authApi
      .me()
      .then((res) => {
        setAuth(res.data, token)
      })
      .catch(() => {
        clearAuth()
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

export { useAuthStore }
