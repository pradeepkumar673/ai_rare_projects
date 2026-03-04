import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Star } from 'lucide-react'
import { Button } from './button'
import { Textarea } from './textarea'
import { cn } from '@/lib/utils'

interface FeedbackWidgetProps {
  context?: 'diagnosis' | 'consultation'
  onSubmit?: (rating: number, comment: string) => void
  className?: string
}

export function FeedbackWidget({ context = 'diagnosis', onSubmit, className }: FeedbackWidgetProps) {
  const [rating, setRating] = useState<number>(0)
  const [hovered, setHovered] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    onSubmit?.(rating, comment)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className={cn('rounded-2xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-6 text-center', className)}>
        <ThumbsUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-medium text-emerald-700 dark:text-emerald-400">Thank you for your feedback!</p>
        <p className="text-sm text-emerald-600/70 dark:text-emerald-500/70 mt-1">Your input helps improve our AI.</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-2xl border bg-card p-6', className)}>
      <h4 className="font-display font-semibold text-foreground mb-1">
        Rate this {context}
      </h4>
      <p className="text-sm text-muted-foreground mb-4">
        How helpful was the AI {context === 'diagnosis' ? 'diagnosis' : 'consultation'}?
      </p>

      {/* Star rating */}
      <div className="flex gap-1 mb-4" role="group" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                'w-6 h-6 transition-colors',
                (hovered || rating) >= star
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300 dark:text-slate-600'
              )}
            />
          </button>
        ))}
      </div>

      {/* Quick feedback buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setRating(5); setComment('Very accurate and helpful') }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-colors"
        >
          <ThumbsUp className="w-3 h-3" /> Accurate
        </button>
        <button
          onClick={() => { setRating(2); setComment('Needs improvement') }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
        >
          <ThumbsDown className="w-3 h-3" /> Inaccurate
        </button>
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional: share more details..."
        className="mb-4 text-sm min-h-[60px]"
      />

      <Button
        onClick={handleSubmit}
        disabled={rating === 0}
        size="sm"
        className="w-full"
      >
        Submit Feedback
      </Button>
    </div>
  )
}
