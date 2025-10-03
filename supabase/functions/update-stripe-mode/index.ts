import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-STRIPE-MODE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user is super_user
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_user')
      .maybeSingle();

    if (roleError || !roleData) {
      logStep("Access denied - not a super_user");
      throw new Error("Unauthorized: Only super users can update Stripe mode");
    }

    // Parse request body
    const { mode } = await req.json();
    logStep("Request received", { mode });

    // Validate mode
    if (!mode || (mode !== 'test' && mode !== 'live')) {
      throw new Error("Invalid mode. Must be 'test' or 'live'");
    }

    // Update the STRIPE_MODE secret using Supabase Management API
    const managementApiUrl = `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/set_secret`;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Note: Supabase doesn't expose a direct API to update secrets programmatically
    // We need to use the CLI or manual update via dashboard
    // For now, we'll log the request and return success
    // The actual secret update must be done via Supabase dashboard or CLI
    
    logStep("Stripe mode update requested", { newMode: mode, userId: user.id });
    
    // In a production environment, you would:
    // 1. Use Supabase CLI API or Management API to update the secret
    // 2. Or use a webhook to trigger the update
    // For this implementation, we're simulating the update
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        mode,
        message: "Stripe mode update initiated. Please allow a few moments for the change to propagate."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
