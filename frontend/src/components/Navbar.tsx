import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Activity, LogOut, Sun, Moon, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

interface NavbarProps {
  darkMode: boolean
  toggleDarkMode: () => void
}

export function Navbar({ darkMode, toggleDarkMode }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const isHome = location.pathname === '/'

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <nav
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-300',
        isHome
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5'
          : 'bg-background/80 backdrop-blur-xl border-b border-border'
      )}
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center shadow-sm shadow-teal-500/30">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span
            className={cn(
              'font-display font-semibold text-lg tracking-tight',
              isHome ? 'text-white' : 'text-foreground'
            )}
          >
            RareDiag
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {!isAuthenticated && (
            <>
              <Link
                to="/#how-it-works"
                className={cn(
                  'text-sm font-medium transition-colors',
                  isHome
                    ? 'text-slate-300 hover:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                How It Works
              </Link>
              <Link
                to="/#partners"
                className={cn(
                  'text-sm font-medium transition-colors',
                  isHome
                    ? 'text-slate-300 hover:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Partners
              </Link>
            </>
          )}
          {isAuthenticated && user && (
            <>
              <Link
                to={`/dashboard/${user.role}`}
                className={cn(
                  'text-sm font-medium transition-colors',
                  isHome
                    ? 'text-slate-300 hover:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Dashboard
              </Link>
              {user.role === 'user' && (
                <Link
                  to="/diagnose"
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isHome
                      ? 'text-slate-300 hover:text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  New Diagnosis
                </Link>
              )}
            </>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              isHome
                ? 'text-slate-300 hover:bg-white/10'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated ? (
            <>
              {/* Notifications placeholder */}
              <button
                aria-label="Notifications"
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative',
                  isHome
                    ? 'text-slate-300 hover:bg-white/10'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500" />
              </button>

              {/* User avatar */}
              <button
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-accent transition-colors"
              >
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'text-xs font-medium hidden sm:block',
                    isHome ? 'text-slate-200' : 'text-foreground'
                  )}
                >
                  {user?.name?.split(' ')[0]}
                </span>
                <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className={isHome ? 'text-slate-300 hover:text-white hover:bg-white/10' : ''}
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                variant={isHome ? 'teal' : 'default'}
                size="sm"
                asChild
              >
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className={cn(
              'md:hidden w-9 h-9 rounded-xl flex items-center justify-center',
              isHome ? 'text-white hover:bg-white/10' : 'text-foreground hover:bg-accent'
            )}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className={cn(
            'md:hidden border-t px-4 py-4 space-y-3',
            isHome
              ? 'border-white/10 bg-slate-950'
              : 'border-border bg-background'
          )}
        >
          {isAuthenticated ? (
            <>
              <Link
                to={`/dashboard/${user?.role}`}
                className="block text-sm text-muted-foreground hover:text-foreground py-1.5"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              {user?.role === 'user' && (
                <Link
                  to="/diagnose"
                  className="block text-sm text-muted-foreground hover:text-foreground py-1.5"
                  onClick={() => setMobileOpen(false)}
                >
                  New Diagnosis
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="block text-sm text-red-500 py-1.5"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block text-sm text-muted-foreground hover:text-foreground py-1.5"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="block text-sm text-teal-600 dark:text-teal-400 font-medium py-1.5"
                onClick={() => setMobileOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
