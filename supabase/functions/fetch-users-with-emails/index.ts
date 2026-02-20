import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { corsHeaders } from '../_shared/cors.ts'

interface UserProfile {
  id: string;
  user_id: string;
  broker_name: string | null;
  broker_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface UserWithEmail extends UserProfile {
  email: string;
  roles: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create client with the user's token for verification
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the user is authenticated and has admin/super_user role
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Check if user has admin or super_user role from user_roles table
    const { data: userRoles, error: rolesError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (rolesError) {
      throw new Error('Failed to fetch user roles')
    }

    const roles = (userRoles || []).map(r => r.role)
    const isAdminOrSuperUser = roles.includes('admin') || roles.includes('super_user')

    if (!isAdminOrSuperUser) {
      throw new Error('Insufficient permissions')
    }

    // Get broker_id from profiles (without role)
    const { data: profileData, error: profileError } = await supabaseUser
      .from('profiles')
      .select('broker_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profileData) {
      throw new Error('Profile not found')
    }

    // ✅ Support optional showDeleted parameter
    const url = new URL(req.url);
    const showDeleted = url.searchParams.get('showDeleted') === 'true';

    // Fetch profiles with broker scoping for admins
    let profilesQuery = supabaseAdmin
      .from('profiles')
      .select('*');

    // Filter soft-deleted users by default
    if (!showDeleted) {
      profilesQuery = profilesQuery.eq('is_deleted', false);
    }

    profilesQuery = profilesQuery.order('created_at', { ascending: false });

    // Apply broker scoping for admin users (not super_user)
    if (roles.includes('admin') && !roles.includes('super_user') && profileData.broker_id) {
      profilesQuery = profilesQuery.eq('broker_id', profileData.broker_id);
    }

    const { data: profiles, error: profilesError } = await profilesQuery

    if (profilesError) {
      throw profilesError
    }

    // Fetch all users from auth.users with pagination
    const allAuthUsers: any[] = [];
    let page = 1;
    while (true) {
      const { data, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (authUsersError) {
        throw authUsersError;
      }
      allAuthUsers.push(...(data.users || []));
      if (!data.users || data.users.length < 1000) break;
      page++;
    }

    // Fetch all user roles
    const { data: allUserRoles, error: allRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')

    if (allRolesError) {
      throw allRolesError
    }

    // Create maps for quick lookup
    const emailMap = new Map()
    allAuthUsers.forEach(authUser => {
      emailMap.set(authUser.id, authUser.email)
    })

    const rolesMap = new Map<string, string[]>()
    allUserRoles?.forEach(ur => {
      if (!rolesMap.has(ur.user_id)) {
        rolesMap.set(ur.user_id, [])
      }
      rolesMap.get(ur.user_id)!.push(ur.role)
    })

    // Combine profiles with emails and roles
    const usersWithEmails: UserWithEmail[] = (profiles || []).map(profile => ({
      ...profile,
      email: emailMap.get(profile.user_id) || 'Unknown',
      roles: rolesMap.get(profile.user_id) || ['user']
    }))

    return new Response(
      JSON.stringify({ users: usersWithEmails }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in fetch-users-with-emails:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})