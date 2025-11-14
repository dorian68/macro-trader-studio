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

  console.log('[RESTORE-USER-SELF] Function called');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

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

    console.log('[RESTORE-USER-SELF] Restoring user:', user.id);

    // Check if user is actually soft-deleted
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('is_deleted, deleted_at, deleted_by')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      console.error('[RESTORE-USER-SELF] Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.is_deleted) {
      return new Response(
        JSON.stringify({ success: true, message: 'Account is already active' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Restore the user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[RESTORE-USER-SELF] Failed:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to restore account', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[AUDIT] User ${user.id} self-restored at ${new Date().toISOString()}`)
    
    return new Response(
      JSON.stringify({ success: true, message: 'Account successfully restored' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[RESTORE-USER-SELF] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
