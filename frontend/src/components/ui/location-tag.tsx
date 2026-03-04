import { MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LocationTagProps {
  city: string
  country?: string
  timezone?: string
  className?: string
}

export function LocationTag({ city, country, timezone, className }: LocationTagProps) {
  const localTime = timezone
    ? new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
      }).format(new Date())
    : null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-full px-3 py-1.5 text-xs font-medium border',
        'bg-slate-50 border-slate-200 text-slate-600',
        'dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300',
        className
      )}
    >
      <span className="flex items-center gap-1">
        <MapPin className="w-3 h-3 text-teal-500" aria-hidden="true" />
        {city}
        {country && `, ${country}`}
      </span>
      {localTime && (
        <>
          <span className="w-px h-3 bg-slate-300 dark:bg-slate-600" />
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-teal-500" aria-hidden="true" />
            {localTime}
          </span>
        </>
      )}
    </div>
  )
}
