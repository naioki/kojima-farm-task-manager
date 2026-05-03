'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface VoiceButtonProps {
  onTranscript: (transcript: string) => void
  isDisabled: boolean
}

/**
 * Large mic button using the Web Speech API (SpeechRecognition).
 * Falls back to a text-only message when the browser doesn't support it.
 * Language is set to Japanese (ja-JP); adjust for other locales.
 */
export function VoiceButton({ onTranscript, isDisabled }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false)

  // Detect support once on mount — safe in client component
  const [isSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Keep a ref so recognition.onresult always calls the latest callback,
  // even if the parent's phase changed while the user was speaking.
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])

  const startListening = useCallback(() => {
    if (!isSupported || isDisabled || isListening) return

    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'ja-JP'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      if (transcript.trim()) {
        onTranscriptRef.current(transcript.trim())
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }, [isDisabled, isListening, isSupported, onTranscript])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  if (!isSupported) {
    return (
      <p className="text-center text-xs text-gray-400">
        音声入力はこのブラウザでは利用できません。テキスト入力をご使用ください。
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={isDisabled}
        aria-label={isListening ? '録音を停止する' : '音声入力を開始する'}
        aria-pressed={isListening}
        className={`
          relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg
          transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-green-400
          ${isListening
            ? 'scale-110 bg-red-500 hover:bg-red-600'
            : 'bg-green-600 hover:scale-105 hover:bg-green-700'
          }
          ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
      >
        {/* Ripple animation while recording */}
        {isListening && (
          <span
            className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-50"
            aria-hidden="true"
          />
        )}
        <span className="relative z-10 text-3xl" aria-hidden="true">
          {isListening ? '⏹' : '🎤'}
        </span>
      </button>

      <p className="text-xs text-gray-500">
        {isListening ? '話してください… (タップで停止)' : 'タップして音声入力'}
      </p>
    </div>
  )
}
