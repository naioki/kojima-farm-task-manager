import type { ChatMessage } from '@/lib/types'

interface ChatMessageBubbleProps {
  message: ChatMessage
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-3 shadow-sm
          ${isUser
            ? 'rounded-tr-sm bg-green-600 text-white'
            : 'rounded-tl-sm border border-gray-100 bg-white text-gray-800'
          }
        `}
      >
        {!isUser && (
          <p className="mb-1 text-xs font-semibold text-green-600">🌱 AI アシスタント</p>
        )}

        {/* Pre-wrap preserves the multi-line reply format from the API */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>

        <p className={`mt-1 text-right text-xs ${isUser ? 'text-green-200' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
