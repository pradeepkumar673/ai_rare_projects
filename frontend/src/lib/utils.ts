import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getRiskColor(risk: string): string {
  switch (risk?.toLowerCase()) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800'
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800'
    case 'low':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800'
    default:
      return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700'
  }
}

export function getUrgencyLabel(urgency: string): string {
  switch (urgency?.toLowerCase()) {
    case 'immediate':
      return '🚨 Immediate specialist consultation required'
    case 'soon':
      return '⚠️ Consult specialist within 48–72 hours'
    case 'routine':
      return '✅ Routine follow-up recommended'
    default:
      return '📋 Review with your physician'
  }
}
