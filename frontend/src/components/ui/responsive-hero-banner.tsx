import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface HeroAction {
  label: string
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'outline'
  icon?: ReactNode
}

interface ResponsiveHeroBannerProps {
  headline: ReactNode
  subheadline?: string
  actions?: HeroAction[]
  badge?: string
  visual?: ReactNode
  className?: string
}

/**
 * Full-bleed responsive hero section.
 * Left column: badge + headline + sub + CTAs
 * Right column: custom visual (image, illustration, 3D widget, etc.)
 */
export function ResponsiveHeroBanner({
  headline,
  subheadline,
  actions = [],
  badge,
  visual,
  className,
}: ResponsiveHeroBannerProps) {
  return (
    <section
      className={cn(
        'relative min-h-[88vh] flex items-center overflow-hidden',
        'bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950',
        className
      )}
      aria-label="Hero section"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-teal-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-teal-600/8 blur-[100px]" />
        {/* Floating orbs */}
        <div className="absolute top-20 right-1/3 w-3 h-3 rounded-full bg-teal-400/40 animate-pulse" />
        <div className="absolute bottom-32 left-1/4 w-2 h-2 rounded-full bg-teal-300/30 animate-pulse delay-700" />
        <div className="absolute top-1/2 right-1/4 w-4 h-4 rounded-full bg-teal-500/20 animate-pulse delay-300" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text content */}
          <div className="space-y-8 animate-fade-in">
            {badge && (
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-sm font-medium text-teal-300">{badge}</span>
              </div>
            )}

            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-display font-semibold leading-[1.08] tracking-tight text-white">
              {headline}
            </h1>

            {subheadline && (
              <p className="text-lg lg:text-xl text-slate-300/80 leading-relaxed max-w-lg">
                {subheadline}
              </p>
            )}

            {actions.length > 0 && (
              <div className="flex flex-wrap gap-4 pt-2">
                {actions.map((action, i) =>
                  action.href ? (
                    <a
                      key={i}
                      href={action.href}
                      className={cn(
                        'inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm transition-all',
                        action.variant === 'outline'
                          ? 'border border-white/20 text-white hover:bg-white/10'
                          : 'bg-teal-500 text-white hover:bg-teal-400 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40'
                      )}
                    >
                      {action.icon}
                      {action.label}
                    </a>
                  ) : (
                    <button
                      key={i}
                      onClick={action.onClick}
                      className={cn(
                        'inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm transition-all active:scale-[0.98]',
                        action.variant === 'outline'
                          ? 'border border-white/20 text-white hover:bg-white/10'
                          : 'bg-teal-500 text-white hover:bg-teal-400 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40'
                      )}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Right: Visual */}
          {visual && (
            <div className="hidden lg:flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {visual}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
