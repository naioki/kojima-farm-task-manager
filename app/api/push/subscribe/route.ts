export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'

interface PushSubscriptionJSON {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

// ── POST /api/push/subscribe — save a new subscription ─────────

export async function POST(request: Request): Promise<Response> {
  try {
    const sub: PushSubscriptionJSON = await request.json()

    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return Response.json({ error: 'Invalid subscription object' }, { status: 400 })
    }

    const supabase = await createClient()

    // Upsert by endpoint so re-subscribing the same browser doesn't create duplicates.
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint:        sub.endpoint,
          p256dh:          sub.keys.p256dh,
          auth:            sub.keys.auth,
          expiration_time: sub.expirationTime ?? null,
        },
        { onConflict: 'endpoint' },
      )

    if (error) throw error

    return Response.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/push/subscribe error:', err)
    return Response.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

// ── DELETE /api/push/subscribe — remove a subscription ─────────

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { endpoint }: { endpoint: string } = await request.json()

    if (!endpoint) {
      return Response.json({ error: 'endpoint is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) throw error

    return Response.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/push/subscribe error:', err)
    return Response.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
