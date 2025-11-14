import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApproveReactivationRequest {
  request_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[APPROVE-REACTIVATION] Function called');

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

    // Check if user is super_user
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_user')
      .maybeSingle()

    if (rolesError || !roles) {
      console.error('[APPROVE-REACTIVATION] Not authorized:', user.id)
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Super user role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { request_id, action, rejection_reason }: ApproveReactivationRequest = await req.json()

    if (!request_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: request_id and action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'reject' && !rejection_reason) {
      return new Response(
        JSON.stringify({ error: 'Rejection reason is required when rejecting a request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[APPROVE-REACTIVATION] Processing ${action} for request ${request_id}`);

    // Get the reactivation request
    const { data: request, error: fetchError } = await supabase
      .from('reactivation_requests')
      .select('*')
      .eq('id', request_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (fetchError) {
      console.error('[APPROVE-REACTIVATION] Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch request', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!request) {
      return new Response(
        JSON.stringify({ error: 'Request not found or already processed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'approve') {
      // Restore the user profile
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null
        })
        .eq('user_id', request.user_id)

      if (updateProfileError) {
        console.error('[APPROVE-REACTIVATION] Profile update error:', updateProfileError)
        return new Response(
          JSON.stringify({ error: 'Failed to restore profile', details: updateProfileError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update request status
      const { error: updateRequestError } = await supabase
        .from('reactivation_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request_id)

      if (updateRequestError) {
        console.error('[APPROVE-REACTIVATION] Request update error:', updateRequestError)
        return new Response(
          JSON.stringify({ error: 'Failed to update request', details: updateRequestError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send approval email to user
      try {
        await supabase.functions.invoke('send-admin-notification', {
          body: {
            type: 'reactivation_approved',
            userEmail: request.email,
            userName: request.email
          }
        })
      } catch (emailError) {
        console.error('[APPROVE-REACTIVATION] Email error:', emailError)
      }

      console.log(`[AUDIT] Request ${request_id} approved by ${user.id} for user ${request.user_id}`)

      return new Response(
        JSON.stringify({ success: true, message: 'Reactivation request approved successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'reject') {
      // Update request status
      const { error: updateRequestError } = await supabase
        .from('reactivation_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason
        })
        .eq('id', request_id)

      if (updateRequestError) {
        console.error('[APPROVE-REACTIVATION] Request update error:', updateRequestError)
        return new Response(
          JSON.stringify({ error: 'Failed to update request', details: updateRequestError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send rejection email to user
      try {
        await supabase.functions.invoke('send-admin-notification', {
          body: {
            type: 'reactivation_rejected',
            userEmail: request.email,
            userName: request.email,
            metadata: {
              rejectionReason: rejection_reason
            }
          }
        })
      } catch (emailError) {
        console.error('[APPROVE-REACTIVATION] Email error:', emailError)
      }

      console.log(`[AUDIT] Request ${request_id} rejected by ${user.id} for user ${request.user_id}`)

      return new Response(
        JSON.stringify({ success: true, message: 'Reactivation request rejected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[APPROVE-REACTIVATION] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
