// Service Worker for Web Push Notifications
// Handles push events and notification click routing.

const CACHE_NAME = 'farm-task-v1'

// ── Install / activate lifecycle ──────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ── Push event ────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: '農場タスク通知', body: event.data.text() }
  }

  const { title = '農場タスク', body = '', url = '/', badge = '/favicon.ico' } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: badge,
      badge,
      tag: 'farm-task',          // Replaces previous notification with same tag
      renotify: true,
      data: { url },
      actions: [
        { action: 'open',    title: '確認する' },
        { action: 'dismiss', title: '閉じる'  },
      ],
    }),
  )
})

// ── Notification click ────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an already-open window if available
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    }),
  )
})
