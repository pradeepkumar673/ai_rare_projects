import { cn } from '@/lib/utils'

interface CircleUniqueLoadProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  label?: string
  className?: string
}

const sizes = {
  sm: { outer: 'w-8 h-8', inner: 'w-5 h-5', text: 'text-xs' },
  md: { outer: 'w-14 h-14', inner: 'w-9 h-9', text: 'text-sm' },
  lg: { outer: 'w-20 h-20', inner: 'w-13 h-13', text: 'text-base' },
  xl: { outer: 'w-28 h-28', inner: 'w-18 h-18', text: 'text-lg' },
}

/**
 * Unique medical-themed circular loader with pulsing rings and a DNA cross motif.
 */
export function CircleUniqueLoad({
  size = 'md',
  label,
  className,
}: CircleUniqueLoadProps) {
  const s = sizes[size]

  return (
    <div className={cn('flex flex-col items-center gap-4', className)} role="status" aria-label={label ?? 'Loading'}>
      <div className={cn('relative flex items-center justify-center', s.outer)}>
        {/* Outer spinning ring */}
        <div
          className={cn(
            'absolute inset-0 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin',
            s.outer
          )}
        />
        {/* Middle pulsing ring */}
        <div
          className={cn(
            'absolute rounded-full border border-teal-400/20 animate-ping',
            size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-10 h-10' : size === 'lg' ? 'w-14 h-14' : 'w-20 h-20'
          )}
        />
        {/* Inner pulse dot */}
        <div
          className={cn(
            'rounded-full bg-teal-500/80 animate-pulse',
            size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-6 h-6'
          )}
        />
      </div>
      {label && (
        <p className={cn('text-muted-foreground font-medium animate-pulse', s.text)}>{label}</p>
      )}
    </div>
  )
}

/**
 * Full-screen overlay loader for diagnosis processing.
 */
export function FullScreenLoader({ label = 'Analyzing your data…' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="glass-card p-10 flex flex-col items-center gap-6 max-w-xs text-center">
        <CircleUniqueLoad size="xl" />
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground mb-1">
            AI Analysis in Progress
          </h3>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        {/* Step indicators */}
        <div className="w-full space-y-2">
          {['Parsing clinical data', 'Running ML model', 'Generating SHAP values', 'Building knowledge graph'].map(
            (step, i) => (
              <div key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
                {step}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
