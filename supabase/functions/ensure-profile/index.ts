import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // Use service role client to verify user and bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user with getUser (standard pattern, consistent with other edge functions)
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = userData.user.id

    // Check if profile already exists
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_deleted')
      .eq('user_id', userId)
      .maybeSingle()

    if (selectError) {
      console.error('[ensure-profile] Error checking profile:', selectError)
      throw selectError
    }

    // If profile exists and is not deleted, nothing to do
    if (existing && !existing.is_deleted) {
      return new Response(JSON.stringify({ created: false, message: 'Profile already exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // If profile exists but is deleted, skip (safety)
    if (existing?.is_deleted) {
      return new Response(JSON.stringify({ created: false, message: 'Deleted profile exists for different auth user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Create profile with pending status
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        status: 'pending',
      })

    if (insertError) {
      if (insertError.code === '23505') {
        console.log('[ensure-profile] Profile created by concurrent request, ignoring duplicate')
        return new Response(JSON.stringify({ created: false, message: 'Profile created concurrently' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      console.error('[ensure-profile] Error creating profile:', insertError)
      throw insertError
    }

    // Also ensure default role exists
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'user' })
      .then(({ error }) => {
        if (error && error.code !== '23505') {
          console.error('[ensure-profile] Error creating default role:', error)
        }
      })

    console.log(`[ensure-profile] Created profile for user ${userId}`)

    return new Response(JSON.stringify({ created: true, message: 'Profile created successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[ensure-profile] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
