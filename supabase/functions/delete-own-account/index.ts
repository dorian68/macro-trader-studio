import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[DELETE-OWN-ACCOUNT] Self-service account deletion called');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id;
    console.log('[DELETE-OWN-ACCOUNT] User requesting self-deletion:', userId);

    // Validate request body has confirmation
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body is OK if we just check confirmation
    }

    if (body.confirmation !== 'DELETE') {
      return new Response(
        JSON.stringify({ error: 'Confirmation required. Send { "confirmation": "DELETE" }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Get email hash for audit
    let emailHash = 'unknown';
    try {
      if (user.email) {
        const encoder = new TextEncoder();
        const data = encoder.encode(user.email.toLowerCase());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        emailHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      console.warn('[DELETE-OWN-ACCOUNT] Could not hash email:', e);
    }

    // 2. Get profile for audit metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('broker_name, user_plan, created_at, is_deleted')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile?.is_deleted) {
      return new Response(
        JSON.stringify({ success: true, message: 'Account already deleted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2b. Cancel any active Stripe subscriptions before deletion
    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('STRIPE_SECRET_KEY_LIVE');
      if (stripeKey && user.email) {
        const { default: Stripe } = await import('https://esm.sh/stripe@18.5.0');
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active' });
          for (const sub of subscriptions.data) {
            console.log(`[DELETE-OWN-ACCOUNT] Canceling subscription ${sub.id} for customer ${customerId}`);
            await stripe.subscriptions.cancel(sub.id);
          }
          console.log(`[DELETE-OWN-ACCOUNT] Canceled ${subscriptions.data.length} active subscription(s)`);
        }
      } else {
        console.warn('[DELETE-OWN-ACCOUNT] No Stripe key or email available, skipping subscription cleanup');
      }
    } catch (stripeErr) {
      console.error('[DELETE-OWN-ACCOUNT] Stripe cleanup failed (non-blocking):', stripeErr);
    }

    // 3. Soft delete profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[DELETE-OWN-ACCOUNT] Failed to soft delete profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Insert audit record
    try {
      await supabase.from('deleted_accounts_audit').insert({
        original_user_id: userId,
        email_hash: emailHash,
        deleted_by: userId,
        deletion_type: 'self_service',
        metadata: {
          broker_name: profile?.broker_name,
          user_plan: profile?.user_plan,
          profile_created_at: profile?.created_at
        }
      });
    } catch (auditErr) {
      console.error('[DELETE-OWN-ACCOUNT] Audit insert failed (non-blocking):', auditErr);
    }

    // 5. Hard delete from auth.users — frees email, invalidates all tokens
    console.log('[DELETE-OWN-ACCOUNT] Hard deleting auth user:', userId);
    try {
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteAuthError) {
        console.error('[DELETE-OWN-ACCOUNT] CRITICAL: auth deletion failed:', deleteAuthError);
        // Profile is soft-deleted; admin will need to clean up auth.users manually
      }
    } catch (deleteErr) {
      console.error('[DELETE-OWN-ACCOUNT] Exception during auth deletion:', deleteErr);
    }

    console.log(`[AUDIT] User ${userId} self-deleted at ${new Date().toISOString()}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[DELETE-OWN-ACCOUNT] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
