'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type {
  ChatMessage,
  ConversationPhase,
  GeminiApiResponse,
  GeminiApiSuccess,
  StructuredFarmData,
} from '@/lib/types'
import { ChatMessageBubble } from './ChatMessageBubble'

// ── Types ─────────────────────────────────────────────────────

interface ChatInterfaceProps {
  houseId: string
  houseName: string
}

// ── Helpers ───────────────────────────────────────────────────

function makeMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, timestamp: new Date() }
}

// ── Sub-components ────────────────────────────────────────────

/** Animated dots shown while waiting for the Gemini API response */
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-green-400 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-green-400 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-green-400" />
        </div>
      </div>
    </div>
  )
}

/** Inline spinner for the Send button loading state */
function ButtonSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────

/**
 * Hybrid voice + text chat interface.
 *
 * Input methods (both trigger the exact same `sendTranscript` logic):
 *   1. Text field + Send button
 *   2. Mic button (Web Speech API → speech-to-text → sendTranscript)
 *
 * Mobile-first design:
 *   - All interactive elements are h-14 (56 px) for glove-friendly tapping
 *   - Input bar uses .pb-safe to clear the iOS home-indicator notch
 *   - Message list scrolls independently; input bar never moves
 */
export function ChatInterface({ houseId, houseName }: ChatInterfaceProps) {
  // ── State ──────────────────────────────────────────────────

  const [messages, setMessages] = useState<ChatMessage[]>([
    makeMessage(
      'assistant',
      `${houseName}の作業記録を開始します。\nマイクボタンまたはテキストで、今日の作業状況を入力してください。\n\n例：「トマトの生育は順調です。アブラムシを見つけたので薬剤散布しました。」`,
    ),
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [isListening, setIsListening] = useState(false)

  // Detect mic support once (avoids SSR mismatch)
  const [isMicSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  })

  // Multi-turn conversation state
  const [phase, setPhase] = useState<ConversationPhase>('initial')
  const [partialData, setPartialData] = useState<Partial<StructuredFarmData>>({})
  const [initialTranscript, setInitialTranscript] = useState('')

  // ── Refs ───────────────────────────────────────────────────

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Stable ref so recognition.onresult always calls the latest sendTranscript,
  // even when phase changes mid-recording.
  const sendTranscriptRef = useRef<(t: string) => void>(() => undefined)

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Core logic ─────────────────────────────────────────────

  const appendMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, makeMessage(role, content)])
  }, [])

  const sendTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim() || isLoading) return

      appendMessage('user', transcript)
      setIsLoading(true)

      // Capture current conversation state before the async call
      const currentPhase = phase
      const currentPartialData = partialData
      const currentInitialTranscript = initialTranscript

      if (currentPhase === 'initial') {
        setInitialTranscript(transcript)
      }

      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            houseId,
            phase: currentPhase,
            partialData: currentPhase === 'awaiting_next_task' ? currentPartialData : undefined,
            initialTranscript:
              currentPhase === 'awaiting_next_task' ? currentInitialTranscript : undefined,
          }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data: GeminiApiResponse = await res.json()

        if ('error' in data) {
          appendMessage('assistant', `エラーが発生しました: ${data.error}`)
          return
        }

        const success = data as GeminiApiSuccess
        appendMessage('assistant', success.reply)

        if (success.phase === 'awaiting_next_task' && success.partialData) {
          setPhase('awaiting_next_task')
          setPartialData(success.partialData)
        } else if (success.phase === 'complete') {
          setPhase('initial')
          setPartialData({})
          setInitialTranscript('')
        }
      } catch (err) {
        console.error('Chat API error:', err)
        appendMessage(
          'assistant',
          '通信エラーが発生しました。電波状況を確認してもう一度お試しください。',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [appendMessage, houseId, initialTranscript, isLoading, partialData, phase],
  )

  // Keep the ref in sync with the latest sendTranscript closure
  useEffect(() => {
    sendTranscriptRef.current = sendTranscript
  }, [sendTranscript])

  // ── Voice input ────────────────────────────────────────────

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    if (!isMicSupported || isLoading) return

    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'ja-JP'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      if (transcript.trim()) {
        // Use ref so we always have the latest phase/partialData in scope
        sendTranscriptRef.current(transcript.trim())
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }, [isLoading, isMicSupported])

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // ── Text input ─────────────────────────────────────────────

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || isLoading) return
    sendTranscript(textInput.trim())
    setTextInput('')
    // Return focus to input for quick follow-up entry on desktop
    textInputRef.current?.focus()
  }

  // ── Derived UI state ───────────────────────────────────────

  // The text input is blocked while the mic is active to avoid mixed input
  const isTextInputDisabled = isLoading || isListening
  const isSendDisabled = isLoading || !textInput.trim()
  const isMicDisabled = isLoading

  const textPlaceholder = isListening
    ? '🎤 音声認識中… (タップで停止)'
    : phase === 'awaiting_next_task'
      ? '明日の作業内容を入力してください...'
      : '作業状況を入力してください...'

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">

      {/* ── Message list ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {messages.map(message => (
            <ChatMessageBubble key={message.id} message={message} />
          ))}

          {/* Typing indicator — only shown while waiting; messages already exist */}
          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input bar (sticks to bottom) ─────────────────── */}
      {/*
        pb-safe applies: padding-bottom: max(0.75rem, env(safe-area-inset-bottom))
        This clears the iOS home indicator notch without double-padding on other devices.
      */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 pt-3 pb-safe shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">

        {/* Phase context hint — shown only when AI is awaiting the next task */}
        {phase === 'awaiting_next_task' && (
          <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-base" aria-hidden="true">💬</span>
            <p className="text-xs font-medium text-amber-700">
              明日予定している具体的な作業を教えてください
            </p>
          </div>
        )}

        {/*
          Input row layout:
          ┌────────────────────────────────┐ ┌──────┐ ┌──────────┐
          │ text input (flex-1, h-14)      │ │  🎤  │ │  送 信   │
          └────────────────────────────────┘ └──────┘ └──────────┘
          All elements are h-14 (56px) — minimum glove-friendly touch target.
        */}
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">

          {/* Text input */}
          <input
            ref={textInputRef}
            type="text"
            value={isListening ? '' : textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder={textPlaceholder}
            disabled={isTextInputDisabled}
            autoComplete="off"
            autoCorrect="off"
            className={`
              h-14 flex-1 rounded-2xl border px-4 text-sm
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-green-400
              disabled:cursor-not-allowed
              ${isListening
                ? 'border-red-300 bg-red-50 text-red-600 placeholder:text-red-400'
                : 'border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:bg-white'
              }
              disabled:opacity-70
            `}
          />

          {/* Mic button — hidden on devices without SpeechRecognition support */}
          {isMicSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isMicDisabled}
              aria-label={isListening ? '録音を停止する' : '音声入力を開始する'}
              aria-pressed={isListening}
              className={`
                relative flex h-14 w-14 flex-shrink-0 items-center justify-center
                rounded-full transition-all duration-200
                focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-1
                ${isListening
                  ? 'bg-red-500 text-white focus-visible:ring-red-400'
                  : 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-400'
                }
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              {/* Pulsing ring — visible only while recording */}
              {isListening && (
                <span
                  className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-40"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 text-xl" aria-hidden="true">
                {isListening ? '■' : '🎤'}
              </span>
            </button>
          )}

          {/* Send button */}
          <button
            type="submit"
            disabled={isSendDisabled}
            aria-label="メッセージを送信する"
            className={`
              flex h-14 flex-shrink-0 items-center justify-center gap-1.5
              rounded-2xl px-5 text-sm font-semibold
              transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-1
              ${isSendDisabled
                ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
              }
            `}
          >
            {isLoading ? (
              <ButtonSpinner />
            ) : (
              <>
                <span>送信</span>
                {/* Arrow icon — gives a clear directional affordance */}
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0-4-4m4 4-4 4" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
