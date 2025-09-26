import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { corsHeaders } from '../_shared/cors.ts'

interface UserProfile {
  id: string;
  user_id: string;
  broker_name: string | null;
  broker_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  role: 'user' | 'admin' | 'super_user';
  created_at: string;
  updated_at: string;
}

interface UserWithEmail extends UserProfile {
  email: string;
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

    // Check if user has admin or super_user role and get broker_id for scoping
    const { data: profileData, error: profileError } = await supabaseUser
      .from('profiles')
      .select('role, broker_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profileData || !['admin', 'super_user'].includes(profileData.role)) {
      throw new Error('Insufficient permissions')
    }

    // Fetch profiles with broker scoping for admins
    let profilesQuery = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply broker scoping for admin users
    if (profileData.role === 'admin' && profileData.broker_id) {
      profilesQuery = profilesQuery.eq('broker_id', profileData.broker_id)
    }

    const { data: profiles, error: profilesError } = await profilesQuery

    if (profilesError) {
      throw profilesError
    }

    // Fetch all users from auth.users
    const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authUsersError) {
      throw authUsersError
    }

    // Create a map of user_id to email for quick lookup
    const emailMap = new Map()
    authUsersData.users?.forEach(authUser => {
      emailMap.set(authUser.id, authUser.email)
    })

    // Combine profiles with emails
    const usersWithEmails: UserWithEmail[] = (profiles || []).map(profile => ({
      ...profile,
      email: emailMap.get(profile.user_id) || 'Unknown'
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