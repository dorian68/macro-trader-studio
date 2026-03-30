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

  console.log('Delete user function called');

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

    // Verify caller is authenticated
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

    console.log('[DELETE-USER] Caller authenticated:', user.id);

    // Validate caller has super_user role
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (rolesError) {
      console.error('[DELETE-USER] Failed to fetch roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const roles = (userRoles || []).map(r => r.role);
    if (!roles.includes('super_user')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions: super_user role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = await req.json()
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Get the target user's email for audit before deletion
    let emailHash = 'unknown';
    try {
      const { data: targetUser } = await supabase.auth.admin.getUserById(userId);
      if (targetUser?.user?.email) {
        // SHA-256 hash of email for audit (not storing email in clear)
        const encoder = new TextEncoder();
        const data = encoder.encode(targetUser.user.email.toLowerCase());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        emailHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      console.warn('[DELETE-USER] Could not fetch target user email for audit:', e);
    }

    // 2. Fetch profile for audit metadata
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id, is_deleted, broker_name, user_plan, created_at')
      .eq('user_id', userId)
      .single();

    if (!existingProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingProfile.is_deleted) {
      return new Response(
        JSON.stringify({ success: true, message: 'User was already deactivated', already_deleted: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Soft delete the profile (audit trail)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[DELETE-USER] Failed to soft delete profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to deactivate user', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Insert audit record
    try {
      await supabase.from('deleted_accounts_audit').insert({
        original_user_id: userId,
        email_hash: emailHash,
        deleted_by: user.id,
        deletion_type: 'admin',
        metadata: {
          broker_name: existingProfile.broker_name,
          user_plan: existingProfile.user_plan,
          profile_created_at: existingProfile.created_at
        }
      });
    } catch (auditErr) {
      console.error('[DELETE-USER] Audit insert failed (non-blocking):', auditErr);
    }

    // 5. Hard delete from auth.users — frees the email for future signup
    console.log('[DELETE-USER] Hard deleting auth user:', userId);
    try {
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteAuthError) {
        console.error('[DELETE-USER] CRITICAL: Failed to hard delete auth user:', deleteAuthError);
        // Profile is already soft-deleted. Log for manual intervention.
        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: 'Profile deactivated but auth user deletion failed. Manual intervention required.',
            soft_deleted: true,
            auth_deleted: false
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (deleteErr) {
      console.error('[DELETE-USER] Exception during auth deletion:', deleteErr);
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'Profile deactivated but auth user deletion failed.',
          soft_deleted: true,
          auth_deleted: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[AUDIT] User ${userId} fully deleted by super_user ${user.id} at ${new Date().toISOString()}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User account fully deleted',
        soft_deleted: true,
        auth_deleted: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
