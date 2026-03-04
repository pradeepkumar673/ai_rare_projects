import React, { useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface GlowingEffectProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  disabled?: boolean
}

/**
 * Wraps children with a radial gradient glow that follows the mouse cursor.
 * Apply to interactive cards and containers for a premium feel.
 */
export function GlowingEffect({
  children,
  className,
  glowColor = 'rgba(20, 184, 166, 0.15)',
  disabled = false,
}: GlowingEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !containerRef.current || !glowRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      glowRef.current.style.background = `radial-gradient(400px circle at ${x}px ${y}px, ${glowColor}, transparent 70%)`
    },
    [disabled, glowColor]
  )

  const handleMouseLeave = useCallback(() => {
    if (glowRef.current) {
      glowRef.current.style.background = 'transparent'
    }
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Glow overlay */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] transition-background duration-300"
        aria-hidden="true"
      />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
