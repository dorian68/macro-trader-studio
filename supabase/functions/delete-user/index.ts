import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Delete user function called');

  try {
    // Create a Supabase client with service role key for admin operations
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

    // Get user from JWT token to verify authentication
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
    console.log('Verifying token...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[DELETE-USER] User authenticated:', user.id);

    // ✅ FIX: Validate that the calling user has super_user role via user_roles table
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
    const isSuperUser = roles.includes('super_user');

    console.log('[DELETE-USER] User roles:', roles);

    if (!isSuperUser) {
      console.log('[DELETE-USER] Insufficient permissions. User roles:', roles);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions: super_user role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = await req.json()
    console.log('Deleting user ID:', userId);
    
    if (!userId) {
      console.log('Missing userId in request');
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ Verify user exists and check current soft delete status
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('user_id, is_deleted')
      .eq('user_id', userId)
      .single();

    if (checkError || !existingProfile) {
      console.error('[DELETE-USER] User profile not found:', checkError);
      return new Response(
        JSON.stringify({ error: 'User not found', details: checkError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingProfile.is_deleted) {
      console.log('[DELETE-USER] User already soft deleted:', userId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User was already deactivated',
          already_deleted: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Perform soft delete
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[DELETE-USER] Failed to soft delete:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to deactivate user', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 🔒 Revoke all user sessions to prevent login with existing tokens
    console.log('[DELETE-USER] Revoking all user sessions for:', userId);
    try {
      const { error: signOutError } = await supabase.auth.admin.signOut(userId, 'global');
      if (signOutError) {
        console.error('[DELETE-USER] Warning: Failed to revoke sessions:', signOutError);
      }
    } catch (signOutErr) {
      console.error('[DELETE-USER] Exception during session revocation:', signOutErr);
    }

    // 📝 Audit log
    console.log(`[AUDIT] User ${userId} soft deleted by super_user ${user.id} at ${new Date().toISOString()}`);

    console.log('[DELETE-USER] Soft delete successful');
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User successfully deactivated',
        soft_deleted: true
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
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})