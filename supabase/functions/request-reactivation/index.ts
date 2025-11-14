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

  console.log('[REQUEST-REACTIVATION] Function called');

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

    console.log('[REQUEST-REACTIVATION] User:', user.id);

    // Check if user is actually soft-deleted
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('is_deleted, deleted_at, broker_name, broker_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      console.error('[REQUEST-REACTIVATION] Fetch error:', fetchError)
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
        JSON.stringify({ error: 'Account is already active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if there's already a pending request
    const { data: existingRequest, error: checkError } = await supabase
      .from('reactivation_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (checkError) {
      console.error('[REQUEST-REACTIVATION] Check error:', checkError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing requests', details: checkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingRequest) {
      return new Response(
        JSON.stringify({ error: 'You already have a pending reactivation request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the reactivation request
    const { error: insertError } = await supabase
      .from('reactivation_requests')
      .insert({
        user_id: user.id,
        email: user.email,
        broker_name: profile.broker_name,
        status: 'pending'
      })

    if (insertError) {
      console.error('[REQUEST-REACTIVATION] Insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create reactivation request', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[REQUEST-REACTIVATION] Request created for user ${user.id}`);

    // Get super users emails
    const { data: superUserRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_user')

    if (rolesError) {
      console.error('[REQUEST-REACTIVATION] Roles error:', rolesError)
    }

    if (superUserRoles && superUserRoles.length > 0) {
      // Get emails of super users
      const { data: { users: superUsers }, error: usersError } = await supabase.auth.admin.listUsers()
      
      if (!usersError && superUsers) {
        const superUserIds = superUserRoles.map(r => r.user_id)
        const superUserEmails = superUsers
          .filter(u => superUserIds.includes(u.id))
          .map(u => u.email)
          .filter(Boolean)

        console.log(`[REQUEST-REACTIVATION] Notifying ${superUserEmails.length} super users`);

        // Send notification email to each super user
        for (const email of superUserEmails) {
          try {
            await supabase.functions.invoke('send-admin-notification', {
              body: {
                type: 'reactivation_request',
                userEmail: email,
                userName: user.email,
                metadata: {
                  userEmail: user.email,
                  brokerName: profile.broker_name || 'N/A',
                  deletedAt: profile.deleted_at
                }
              }
            })
          } catch (emailError) {
            console.error('[REQUEST-REACTIVATION] Email error:', emailError)
          }
        }
      }
    }

    console.log(`[AUDIT] User ${user.id} requested reactivation at ${new Date().toISOString()}`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Your reactivation request has been sent. You will receive a response via email within 24-48 hours.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[REQUEST-REACTIVATION] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
