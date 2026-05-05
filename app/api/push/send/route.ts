export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'

// ── VAPID signing via Web Crypto API ──────────────────────────
// The `web-push` npm package uses Node.js-only crypto; we re-implement
// the VAPID JWT + AES-GCM payload encryption using the standard
// Web Crypto API so the route runs on Cloudflare's Edge Runtime.

interface PushPayload {
  title: string
  body: string
  url?: string
}

interface PushSubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
}

// ── POST /api/push/send — broadcast a notification ──────────────
// Body: { title: string, body: string, url?: string }
// Requires VAPID_PRIVATE_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY env vars.
// Returns a summary of successes and failures.

export async function POST(request: Request): Promise<Response> {
  try {
    const payload: PushPayload = await request.json()

    if (!payload.title || !payload.body) {
      return Response.json({ error: 'title と body は必須です' }, { status: 400 })
    }

    const privateKeyB64 = process.env.VAPID_PRIVATE_KEY
    const publicKeyB64  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const subject       = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com'

    if (!privateKeyB64 || !publicKeyB64) {
      return Response.json(
        { error: 'VAPID keys are not configured. Set VAPID_PRIVATE_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY.' },
        { status: 503 },
      )
    }

    const supabase = await createClient()
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')

    if (error) throw error
    if (!subs || subs.length === 0) {
      return Response.json({ sent: 0, failed: 0, message: 'サブスクライバーなし' })
    }

    const results = await Promise.allSettled(
      (subs as PushSubscriptionRow[]).map((sub) =>
        sendPushNotification(sub, payload, publicKeyB64, privateKeyB64, subject),
      ),
    )

    const sent   = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return Response.json({ sent, failed })
  } catch (err) {
    console.error('POST /api/push/send error:', err)
    return Response.json({ error: 'プッシュ通知の送信に失敗しました' }, { status: 500 })
  }
}

// ── VAPID + Web Push Protocol implementation ──────────────────

async function sendPushNotification(
  sub: PushSubscriptionRow,
  payload: PushPayload,
  vapidPublicKeyB64: string,
  vapidPrivateKeyB64: string,
  subject: string,
): Promise<void> {
  const vapidHeaders = await buildVapidHeaders(
    sub.endpoint,
    vapidPublicKeyB64,
    vapidPrivateKeyB64,
    subject,
  )

  const encrypted = await encryptPayload(
    JSON.stringify(payload),
    sub.p256dh,
    sub.auth,
  )

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      ...vapidHeaders,
      'Content-Type':     'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length':   String(encrypted.byteLength),
      'TTL':              '86400',
    },
    body: encrypted,
  })

  if (!res.ok) {
    throw new Error(`Push endpoint returned ${res.status}: ${sub.endpoint}`)
  }
}

// ── VAPID JWT (ES256) ─────────────────────────────────────────

async function buildVapidHeaders(
  endpoint: string,
  publicKeyB64: string,
  privateKeyB64: string,
  subject: string,
): Promise<Record<string, string>> {
  const origin   = new URL(endpoint).origin
  const now      = Math.floor(Date.now() / 1000)
  const exp      = now + 12 * 3600

  const header  = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const claims  = b64url(JSON.stringify({ aud: origin, exp, sub: subject }))
  const sigInput = `${header}.${claims}`

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    base64ToBuffer(privateKeyB64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const sigBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(sigInput),
  )

  const token = `${sigInput}.${bufToB64url(sigBuffer)}`

  return {
    Authorization: `vapid t=${token},k=${publicKeyB64}`,
  }
}

// ── AES-128-GCM payload encryption (RFC 8291) ─────────────────

async function encryptPayload(
  plaintext: string,
  p256dhB64: string,
  authB64: string,
): Promise<ArrayBuffer> {
  const salt       = crypto.getRandomValues(new Uint8Array(16))
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )
  const serverPublicRaw = await crypto.subtle.exportKey('raw', serverKeys.publicKey)

  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    base64ToBuffer(p256dhB64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeys.privateKey,
    256,
  )

  const authBuffer = base64ToBuffer(authB64)

  // PRK_key  = HKDF-SHA-256(auth, sharedSecret, "WebPush: info\0" + clientPub + serverPub)
  const prk = await hkdf(
    sharedSecret,
    authBuffer,
    concat(
      new TextEncoder().encode('WebPush: info\x00'),
      base64ToBuffer(p256dhB64),
      new Uint8Array(serverPublicRaw),
    ),
    32,
  )

  // CEK and nonce via HKDF
  const cek   = await hkdf(prk, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), 16)
  const nonce = await hkdf(prk, salt, new TextEncoder().encode('Content-Encoding: nonce\x00'), 12)

  const key = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    concat(new TextEncoder().encode(plaintext), new Uint8Array([2])), // pad delimiter
  )

  // Build the aes128gcm record:  salt (16) + rs (4) + idlen (1) + serverPublicKey (65) + ciphertext
  const rs        = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false)
  const idlen     = new Uint8Array([65])
  return concat(salt, rs, idlen, new Uint8Array(serverPublicRaw), new Uint8Array(ciphertext))
}

// ── Crypto utilities ──────────────────────────────────────────

async function hkdf(
  ikm: ArrayBuffer,
  salt: ArrayBuffer,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits    = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey,
    length * 8,
  )
  return new Uint8Array(bits)
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total  = arrays.reduce((n, a) => n + a.byteLength, 0)
  const result = new Uint8Array(total)
  let offset   = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.byteLength
  }
  return result
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw     = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0))).buffer
}

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function bufToB64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
