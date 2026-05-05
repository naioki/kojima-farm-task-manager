'use client'

import { Bell, BellOff, Loader2 } from 'lucide-react'
import { usePushNotification } from '@/lib/hooks/usePushNotification'

/**
 * Bell button that toggles Web Push subscription on/off.
 * Rendered inside AdminDashboard header; hidden on unsupported browsers.
 */
export function PushNotificationToggle() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotification()

  if (permission === 'unsupported') return null

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribe()
    } else {
      subscribe()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || permission === 'denied'}
      title={
        permission === 'denied'
          ? '通知がブロックされています。ブラウザの設定から許可してください。'
          : isSubscribed
            ? '通知をオフにする'
            : '通知をオンにする'
      }
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
        permission === 'denied'
          ? 'cursor-not-allowed bg-white/10 text-white/30'
          : isSubscribed
            ? 'bg-white/20 text-white hover:bg-white/30'
            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
    </button>
  )
}
