'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// Web NFC API is not yet in the standard TypeScript DOM lib.
// Declare the minimal types needed for NDEFReader.
declare global {
  interface Window {
    NDEFReader: NDEFReaderConstructor
  }

  interface NDEFReaderConstructor {
    new(): NDEFReaderInstance
  }

  interface NDEFReaderInstance {
    scan(options?: { signal?: AbortSignal }): Promise<void>
    addEventListener(
      type: 'reading',
      listener: (event: NDEFReadingEvent) => void
    ): void
    addEventListener(
      type: 'readingerror',
      listener: (event: Event) => void
    ): void
  }

  interface NDEFReadingEvent extends Event {
    serialNumber: string
    message: NDEFMessage
  }

  interface NDEFMessage {
    records: NDEFRecord[]
  }

  interface NDEFRecord {
    recordType: string
    mediaType?: string
    data: DataView
    toText(): string
    toURL(): string
  }
}

export type NFCScanState = 'idle' | 'scanning' | 'success' | 'error' | 'unsupported'

export interface UseNFCScanReturn {
  /** Whether the current browser/device supports Web NFC (Chrome Android only). */
  supported: boolean
  state: NFCScanState
  error: string | null
  /** Start scanning. Navigates automatically to /house/[id] when a valid tag is read. */
  startScan: () => void
  /** Cancel an active scan. */
  cancelScan: () => void
}

/**
 * Reads NDEF tags written with either:
 *   - A URL record pointing to  /house/<uuid>
 *   - A plain-text record containing just the house UUID
 *
 * Navigation is automatic: once a valid tag is detected the hook calls
 * router.push('/house/<uuid>') and sets state to 'success'.
 *
 * Only one concurrent scan is maintained; calling startScan() while already
 * scanning is a no-op.
 */
export function useNFCScan(): UseNFCScanReturn {
  const router = useRouter()
  const [supported, setSupported] = useState(false)
  const [state, setState] = useState<NFCScanState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'NDEFReader' in window)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortController?.abort()
    }
  }, [abortController])

  const startScan = useCallback(() => {
    if (!supported) {
      setState('unsupported')
      setError('このデバイスは Web NFC に対応していません。Android Chrome が必要です。')
      return
    }

    if (state === 'scanning') return

    const ac = new AbortController()
    setAbortController(ac)
    setState('scanning')
    setError(null)

    const reader = new window.NDEFReader()

    reader.scan({ signal: ac.signal })
      .then(() => {
        reader.addEventListener('reading', (event) => {
          const houseId = extractHouseId(event)
          if (houseId) {
            setState('success')
            ac.abort()
            router.push(`/house/${houseId}`)
          } else {
            setError('このNFCタグにはハウスIDが含まれていません。')
            setState('error')
            ac.abort()
          }
        })

        reader.addEventListener('readingerror', () => {
          setError('NFCタグの読み取りに失敗しました。もう一度試してください。')
          setState('error')
        })
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          setState('idle')
        } else {
          const msg = err instanceof Error ? err.message : 'NFCスキャンを開始できませんでした。'
          setError(msg)
          setState('error')
        }
      })
  }, [supported, state, router])

  const cancelScan = useCallback(() => {
    abortController?.abort()
    setAbortController(null)
    setState('idle')
    setError(null)
  }, [abortController])

  return { supported, state, error, startScan, cancelScan }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function extractHouseId(event: NDEFReadingEvent): string | null {
  for (const record of event.message.records) {
    if (record.recordType === 'url') {
      const url = record.toURL()
      const match = url.match(/\/house\/([0-9a-f-]{36})/i)
      if (match) return match[1]
    }

    if (record.recordType === 'text') {
      const text = record.toText().trim()
      if (UUID_RE.test(text)) return text
    }
  }
  return null
}
