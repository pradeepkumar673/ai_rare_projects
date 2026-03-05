// src/components/Navbar.tsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, Activity, LogOut, Sun, Moon, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

interface NavbarProps {
  darkMode: boolean
  toggleDarkMode: () => void
}

export function Navbar({ darkMode, toggleDarkMode }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, user, clearAuth } = useAuthStore()
  const { t } = useTranslation()
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
                {t('nav.howItWorks')}
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
                {t('nav.partners')}
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
                {t('nav.dashboard')}
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
                  {t('nav.newDiagnosis')}
                </Link>
              )}
            </>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Language Switcher */}
          <LanguageSwitcher variant={isHome ? 'light' : 'dark'} />

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
              <button
                aria-label={t('nav.notifications')}
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

              <button
                onClick={handleLogout}
                title={t('nav.logout')}
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
            <div className="flex items-center gap-2 ms-1">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className={isHome ? 'text-slate-300 hover:text-white hover:bg-white/10' : ''}
              >
                <Link to="/login">{t('nav.login')}</Link>
              </Button>
              <Button
                variant={isHome ? 'teal' : 'default'}
                size="sm"
                asChild
              >
                <Link to="/register">{t('nav.signup')}</Link>
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
              ? 'bg-slate-950 border-white/10'
              : 'bg-background border-border'
          )}
        >
          {!isAuthenticated && (
            <>
              <Link
                to="/#how-it-works"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block text-sm font-medium py-2',
                  isHome ? 'text-slate-300' : 'text-foreground'
                )}
              >
                {t('nav.howItWorks')}
              </Link>
              <Link
                to="/#partners"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block text-sm font-medium py-2',
                  isHome ? 'text-slate-300' : 'text-foreground'
                )}
              >
                {t('nav.partners')}
              </Link>
            </>
          )}
          {isAuthenticated && user && (
            <>
              <Link
                to={`/dashboard/${user.role}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block text-sm font-medium py-2',
                  isHome ? 'text-slate-300' : 'text-foreground'
                )}
              >
                {t('nav.dashboard')}
              </Link>
              {user.role === 'user' && (
                <Link
                  to="/diagnose"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block text-sm font-medium py-2',
                    isHome ? 'text-slate-300' : 'text-foreground'
                  )}
                >
                  {t('nav.newDiagnosis')}
                </Link>
              )}
              <button
                onClick={handleLogout}
                className={cn(
                  'block text-sm font-medium py-2 text-left',
                  isHome ? 'text-slate-300' : 'text-foreground'
                )}
              >
                {t('nav.logout')}
              </button>
            </>
          )}
          {!isAuthenticated && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <Link to="/login">{t('nav.login')}</Link>
              </Button>
              <Button variant="teal" size="sm" asChild className="flex-1">
                <Link to="/register">{t('nav.signup')}</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}