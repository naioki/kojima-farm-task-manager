'use client'

import { useState, useEffect, useCallback } from 'react'

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export interface UsePushNotificationReturn {
  permission: PushPermission
  isSubscribed: boolean
  isLoading: boolean
  /** Request permission and subscribe to push notifications. */
  subscribe: () => Promise<void>
  /** Unsubscribe from push notifications. */
  unsubscribe: () => Promise<void>
}

/**
 * Manages the full Web Push lifecycle:
 *   1. Registers /sw.js as a service worker
 *   2. Requests notification permission
 *   3. Creates a PushSubscription with the server's VAPID public key
 *   4. POSTs the subscription to /api/push/subscribe for server-side storage
 *
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY to be set (generate with web-push CLI or
 * the companion /api/push/generate-keys endpoint).
 */
export function usePushNotification(): UsePushNotificationReturn {
  const [permission,  setPermission]  = useState<PushPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  // ── On mount: check current state ────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission as PushPermission)

    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      setRegistration(reg)
      const existing = await reg.pushManager.getSubscription()
      setIsSubscribed(!!existing)
    })
  }, [])

  // ── Subscribe ─────────────────────────────────────────────────

  const subscribe = useCallback(async () => {
    if (!registration) return
    setIsLoading(true)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm as PushPermission)
      if (perm !== 'granted') return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — push subscription skipped')
        return
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(sub.toJSON()),
      })

      setIsSubscribed(true)
    } catch (err) {
      console.error('Push subscribe failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [registration])

  // ── Unsubscribe ───────────────────────────────────────────────

  const unsubscribe = useCallback(async () => {
    if (!registration) return
    setIsLoading(true)

    try {
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setIsSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [registration])

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe }
}

// ── Helpers ───────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)))
}
