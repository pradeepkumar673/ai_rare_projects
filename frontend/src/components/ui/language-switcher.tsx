// src/components/ui/language-switcher.tsx
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { SUPPORTED_LANGUAGES, type SupportedLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  /** When true, renders as a compact icon-only button (for tight navbars) */
  compact?: boolean
  /** Style variant: 'light' for dark backgrounds (hero), 'dark' for light backgrounds */
  variant?: 'light' | 'dark'
}

export function LanguageSwitcher({ compact = false, variant = 'dark' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)
    ?? SUPPORTED_LANGUAGES[0]

  const changeLang = (code: SupportedLang) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isLight = variant === 'light'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium transition-colors',
          isLight
            ? 'text-slate-300 hover:bg-white/10 hover:text-white'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <Globe className="w-4 h-4 shrink-0" />
        {!compact && (
          <>
            <span className="text-base leading-none">{currentLang.flag}</span>
            <span className="hidden sm:block">{currentLang.label}</span>
            <ChevronDown
              className={cn('w-3 h-3 transition-transform', open && 'rotate-180')}
            />
          </>
        )}
        {compact && (
          <span className="text-base leading-none">{currentLang.flag}</span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-44 rounded-2xl border bg-popover shadow-lg shadow-black/10 overflow-hidden',
            // Align to right on LTR, left on RTL
            'right-0',
            // Animate in
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
        >
          <div className="p-1">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLang(lang.code as SupportedLang)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left',
                  i18n.language === lang.code
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-medium'
                    : 'text-foreground hover:bg-accent'
                )}
              >
                <span className="text-base w-5 text-center">{lang.flag}</span>
                <span className="flex-1">{lang.label}</span>
                {lang.dir === 'rtl' && (
                  <span className="text-xs text-muted-foreground">RTL</span>
                )}
                {i18n.language === lang.code && (
                  <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
