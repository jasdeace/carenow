// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// @ts-ignore
declare const Deno: any;

// Consumable token packs → tokens granted. The keys MUST match the IAP
// product IDs created in App Store Connect.
const TOKEN_PACKS: Record<string, number> = {
  tokens_10: 10,
  tokens_40: 40,
  tokens_120: 120,
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // RevenueCat sends the value configured in its webhook settings as the
  // Authorization header — verify it before trusting the payload.
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
  if (!secret) {
    console.error('REVENUECAT_WEBHOOK_SECRET is not set')
    return new Response('Not configured', { status: 500 })
  }
  if (req.headers.get('Authorization') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { event } = await req.json()
    if (!event?.type) return new Response('No event', { status: 400 })

    // Only consumable token-pack purchases grant tokens here. Bodacare Plus
    // (subscription) access is handled client-side via the RevenueCat
    // entitlement, so subscription events are acknowledged and skipped.
    if (event.type !== 'NON_RENEWING_PURCHASE') {
      return json({ ok: true, skipped: event.type })
    }

    const userId: string | undefined = event.app_user_id
    const tokens = TOKEN_PACKS[event.product_id]
    if (!userId || !tokens) {
      return json({ ok: true, skipped: 'unknown product or user' })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Idempotency — RevenueCat may resend a webhook. The event id is stored
    // as the transaction reason; skip if tokens were already granted for it.
    const reason = `iap:${event.id}`
    const { data: existing } = await supabase
      .from('token_transactions')
      .select('id')
      .eq('reason', reason)
      .maybeSingle()
    if (existing) return json({ ok: true, duplicate: true })

    const { error } = await supabase.rpc('add_tokens', {
      p_user_id: userId,
      p_amount: tokens,
      p_reason: reason,
    })
    if (error) throw error

    return json({ ok: true, granted: tokens })
  } catch (e) {
    const err = e as Error
    console.error('revenuecat-webhook error:', err.message)
    // Non-2xx → RevenueCat retries the delivery.
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
