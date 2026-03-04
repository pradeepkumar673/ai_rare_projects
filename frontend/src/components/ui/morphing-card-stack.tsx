import { useState } from 'react'
import { LayoutGrid, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface CardItem {
  id: string
  [key: string]: unknown
}

interface MorphingCardStackProps<T extends CardItem> {
  items: T[]
  renderCard: (item: T, index: number, isStack: boolean) => React.ReactNode
  className?: string
  emptyState?: React.ReactNode
}

type ViewMode = 'stack' | 'grid'

/**
 * Toggleable stack ↔ grid layout for the doctor triage queue.
 * In stack mode, cards are shown with a layered visual offset (top-most = highest priority).
 * In grid mode, all cards are displayed in a responsive grid.
 */
export function MorphingCardStack<T extends CardItem>({
  items,
  renderCard,
  className,
  emptyState,
}: MorphingCardStackProps<T>) {
  const [mode, setMode] = useState<ViewMode>('grid')

  if (items.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-20', className)}>
        {emptyState ?? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No cases in queue</p>
            <p className="text-sm text-muted-foreground/60 mt-1">New cases will appear here</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} case{items.length !== 1 ? 's' : ''} in queue
        </p>
        <div className="flex items-center gap-1 rounded-xl border p-1 bg-muted">
          <Button
            size="sm"
            variant={mode === 'grid' ? 'default' : 'ghost'}
            onClick={() => setMode('grid')}
            className="h-7 px-2.5"
            aria-label="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant={mode === 'stack' ? 'default' : 'ghost'}
            onClick={() => setMode('stack')}
            className="h-7 px-2.5"
            aria-label="Stack view"
          >
            <Layers className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Cards */}
      {mode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item, i) => renderCard(item, i, false))}
        </div>
      ) : (
        <div className="relative">
          {/* Stack visual – show at most 3 stacked behind the top card */}
          {items.slice(0, 4).map((item, i) => (
            <div
              key={item.id}
              className={cn(
                'transition-all duration-300',
                i === 0
                  ? 'relative z-10'
                  : 'absolute top-0 left-0 right-0'
              )}
              style={
                i > 0
                  ? {
                      zIndex: 10 - i,
                      transform: `translateY(${i * 8}px) scale(${1 - i * 0.02})`,
                      opacity: 1 - i * 0.2,
                    }
                  : undefined
              }
            >
              {renderCard(item, i, true)}
            </div>
          ))}
          {/* Show the rest below the stack */}
          {items.length > 4 && (
            <div className="mt-4 space-y-4" style={{ paddingTop: `${3 * 8}px` }}>
              {items.slice(4).map((item, i) => renderCard(item, i + 4, false))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
