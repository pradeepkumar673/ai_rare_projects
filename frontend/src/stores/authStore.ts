import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, token) => {
        // Store token under the plain 'token' key so the axios interceptor
        // in api.ts can read it with localStorage.getItem('token')
        localStorage.setItem('token', token)
        set({ user, token, isAuthenticated: true, isLoading: false })
      },

      clearAuth: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null, isAuthenticated: false, isLoading: false })
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'rarediag-auth',
      // Only persist user + token; isLoading and isAuthenticated are derived on rehydrate
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const hasToken = !!state.token
          state.isAuthenticated = hasToken
          state.isLoading = false

          // Sync the plain localStorage 'token' key so the axios interceptor
          // always has it available, even after a page refresh
          if (hasToken && state.token) {
            localStorage.setItem('token', state.token)
          } else {
            localStorage.removeItem('token')
          }
        }
      },
    }
  )
)