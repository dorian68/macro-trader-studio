import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACTIVATE-FREE-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Call the safe, atomic, additive RPC
    const { data, error } = await supabaseClient.rpc('activate_free_trial_safe', {
      p_user_id: user.id
    });

    if (error) {
      logStep("ERROR calling activate_free_trial_safe", { message: error.message });
      throw new Error(`RPC error: ${error.message}`);
    }

    logStep("RPC result", data);

    // Handle already-used case with 409
    if (data && !data.success) {
      const statusCode = data.reason === 'already_used' ? 409 : 400;
      return new Response(
        JSON.stringify({ 
          error: data.reason === 'already_used' 
            ? 'Free Trial has already been activated' 
            : data.reason,
          reason: data.reason
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: statusCode,
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Free Trial activated successfully — credits added on top of existing balance",
        user_id: user.id,
        credits_added: data?.credits_added
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in activate-free-trial", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
