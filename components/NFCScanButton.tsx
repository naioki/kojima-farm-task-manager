'use client'

import { Nfc, X, Loader2, CheckCircle2, WifiOff } from 'lucide-react'
import { useNFCScan } from '@/lib/hooks/useNFCScan'

/**
 * Floating NFC scan button for the Staff Farm Map screen.
 *
 * Behaviour:
 *  - Hidden when browser doesn't support Web NFC (no cluttered UI for unsupported devices)
 *  - Tap to start scan → button animates with a pulse ring
 *  - On success, router.push() is called by the hook — this component just shows feedback
 *  - Tap again while scanning → cancels the scan
 */
export function NFCScanButton() {
  const { supported, state, error, startScan, cancelScan } = useNFCScan()

  if (!supported) return null

  const isScanning = state === 'scanning'

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">

      {/* Error / hint toast */}
      {error && (
        <div className="max-w-[220px] rounded-xl bg-red-600 px-3 py-2 text-xs text-white shadow-lg">
          {error}
        </div>
      )}
      {isScanning && (
        <div className="max-w-[220px] rounded-xl bg-green-700 px-3 py-2 text-xs text-white shadow-lg">
          NFCタグにかざしてください…
        </div>
      )}
      {state === 'success' && (
        <div className="max-w-[220px] rounded-xl bg-green-600 px-3 py-2 text-xs text-white shadow-lg">
          ハウスを検出しました！
        </div>
      )}

      {/* Main button */}
      <button
        onClick={isScanning ? cancelScan : startScan}
        aria-label={isScanning ? 'NFCスキャンをキャンセル' : 'NFCでハウスを選択'}
        className={`
          relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl
          transition-colors
          ${isScanning
            ? 'bg-red-500 hover:bg-red-600'
            : state === 'success'
              ? 'bg-green-600 hover:bg-green-700'
              : state === 'error'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-700 hover:bg-green-800'
          }
        `}
      >
        {/* Pulse ring — visible only while scanning */}
        {isScanning && (
          <span className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-50" />
        )}

        <span className="relative text-white">
          {isScanning    && <X           className="h-6 w-6" />}
          {state === 'idle'    && <Nfc         className="h-6 w-6" />}
          {state === 'success' && <CheckCircle2 className="h-6 w-6" />}
          {state === 'error'   && <WifiOff      className="h-6 w-6" />}
          {state === 'unsupported' && <WifiOff  className="h-6 w-6" />}
        </span>
      </button>

      <span className="text-center text-[10px] text-gray-500">
        {isScanning ? 'タップでキャンセル' : 'NFCスキャン'}
      </span>
    </div>
  )
}
