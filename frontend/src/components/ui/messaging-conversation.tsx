import { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { cn, formatTime } from '@/lib/utils'

export interface ChatMessage {
  id: string
  sender_id: string
  sender_name: string
  sender_role: 'user' | 'doctor'
  content: string
  timestamp: string
  avatar?: string
}

interface MessagingConversationProps {
  messages: ChatMessage[]
  currentUserId: string
  className?: string
}

/**
 * Renders the chat conversation thread between patient and doctor.
 * Auto-scrolls to the latest message.
 */
export function MessagingConversation({
  messages,
  currentUserId,
  className,
}: MessagingConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4 p-4', className)}>
      {messages.map((msg) => {
        const isOwn = msg.sender_id === currentUserId
        const initials = msg.sender_name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        return (
          <div
            key={msg.id}
            className={cn('flex items-end gap-2 max-w-[85%]', isOwn ? 'ml-auto flex-row-reverse' : '')}
          >
            <Avatar className="w-7 h-7 shrink-0">
              {msg.avatar && <AvatarImage src={msg.avatar} alt={msg.sender_name} />}
              <AvatarFallback className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
              <span className="text-[10px] text-muted-foreground px-1">
                {isOwn ? 'You' : msg.sender_name}
                {msg.sender_role === 'doctor' && (
                  <span className="ml-1 text-teal-500 dark:text-teal-400 font-medium">· MD</span>
                )}
              </span>
              <div
                className={cn(
                  'px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-full break-words shadow-sm',
                  isOwn
                    ? 'bg-teal-600 text-white rounded-br-sm'
                    : 'bg-card border border-border text-foreground rounded-bl-sm'
                )}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-muted-foreground px-1">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
