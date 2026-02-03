import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyNewRegistrationRequest {
  userEmail: string;
  brokerName?: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, brokerName }: NotifyNewRegistrationRequest = await req.json();

    if (!userEmail) {
      throw new Error('Missing required field: userEmail');
    }

    console.log(`📧 [New Registration] Notifying admins about new registration: ${userEmail}`);

    // Create Supabase client with service role to fetch super users
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all super_user role assignments
    const { data: superUserRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_user');

    if (rolesError) {
      console.error('❌ [New Registration] Error fetching super user roles:', rolesError);
      throw new Error('Failed to fetch super users');
    }

    if (!superUserRoles || superUserRoles.length === 0) {
      console.warn('⚠️ [New Registration] No super users found to notify');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No super users to notify',
        notified: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get emails for super users using auth admin API
    const superUserIds = superUserRoles.map(r => r.user_id);
    console.log(`📋 [New Registration] Found ${superUserIds.length} super user(s)`);

    // Fetch user emails from auth.users via admin API
    const superUserEmails: string[] = [];
    for (const userId of superUserIds) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (!userError && userData?.user?.email) {
        superUserEmails.push(userData.user.email);
      } else {
        console.warn(`⚠️ [New Registration] Could not fetch email for user ${userId}:`, userError);
      }
    }

    if (superUserEmails.length === 0) {
      console.warn('⚠️ [New Registration] Could not resolve any super user emails');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Could not resolve super user emails',
        notified: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`📧 [New Registration] Sending notifications to: ${superUserEmails.join(', ')}`);

    // Send notification to each super user
    const notificationPromises = superUserEmails.map(async (adminEmail) => {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: adminEmail,
          notificationType: 'new_registration',
          userName: userEmail,
          metadata: {
            userEmail,
            brokerName: brokerName || null,
            registeredAt: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [New Registration] Failed to notify ${adminEmail}:`, errorText);
        return { email: adminEmail, success: false, error: errorText };
      }

      console.log(`✅ [New Registration] Notified ${adminEmail}`);
      return { email: adminEmail, success: true };
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`✅ [New Registration] Notification complete: ${successCount}/${results.length} successful`);

    return new Response(JSON.stringify({ 
      success: true,
      notified: successCount,
      total: results.length,
      results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ [New Registration] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
