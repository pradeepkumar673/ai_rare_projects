import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Paperclip, Smile, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SecureMessageGatewayProps {
  onSend: (message: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Secure, HIPAA-styled chat input for patient-doctor messaging.
 * Shows an encryption indicator to build trust.
 */
export function SecureMessageGateway({
  onSend,
  placeholder = 'Type a message…',
  disabled,
  className,
}: SecureMessageGatewayProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Encryption indicator */}
      <div className="flex items-center gap-1.5 px-1">
        <Lock className="w-2.5 h-2.5 text-teal-500" aria-hidden="true" />
        <span className="text-[10px] text-muted-foreground">End-to-end encrypted</span>
      </div>

      <div className="flex items-end gap-2 rounded-2xl border border-input bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring transition-all">
        {/* Attachment button */}
        <button
          aria-label="Attach file"
          className="text-muted-foreground hover:text-foreground transition-colors mb-0.5"
          type="button"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Message input"
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          style={{ height: 'auto', minHeight: '24px', maxHeight: '120px' }}
        />

        {/* Emoji placeholder */}
        <button
          aria-label="Insert emoji"
          className="text-muted-foreground hover:text-foreground transition-colors mb-0.5"
          type="button"
        >
          <Smile className="w-4 h-4" />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-xl transition-all',
            value.trim()
              ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
          type="button"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
