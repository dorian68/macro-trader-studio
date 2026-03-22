import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RENEW-CREDITS] ${step}${detailsStr}`);
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

    // Get users whose credits need to be renewed
    const { data: creditsToRenew, error: fetchError } = await supabaseClient
      .from('user_credits')
      .select(`
        user_id,
        plan_type,
        last_reset_date,
        plan_parameters!inner(renewal_cycle_days)
      `)
      .filter('plan_parameters.renewal_cycle_days', 'gt', 0);

    if (fetchError) {
      logStep("ERROR fetching credits", { error: fetchError.message });
      throw fetchError;
    }

    logStep("Fetched credits data", { count: creditsToRenew?.length || 0 });

    const now = new Date();
    const renewedUsers: string[] = [];
    const errors: any[] = [];

    for (const credit of creditsToRenew || []) {
      const lastReset = new Date(credit.last_reset_date);
      const renewalCycleDays = credit.plan_parameters.renewal_cycle_days;
      const nextResetDate = new Date(lastReset);
      nextResetDate.setDate(nextResetDate.getDate() + renewalCycleDays);

      // Check if renewal is due
      if (now >= nextResetDate) {
        // Build idempotent reference: renew_{userId}_{date} to prevent double-renewal
        const renewalDate = now.toISOString().split('T')[0];
        const referenceId = `renew_${credit.user_id}_${renewalDate}`;

        logStep("Renewing credits", { 
          user_id: credit.user_id, 
          plan_type: credit.plan_type,
          reference_id: referenceId
        });

        // Use idempotent provision_plan_credits instead of initialize_user_credits
        const { data: result, error: renewError } = await supabaseClient.rpc('provision_plan_credits', {
          p_user_id: credit.user_id,
          p_plan_type: credit.plan_type,
          p_source: 'cron_renewal',
          p_reference_id: referenceId
        });

        if (renewError) {
          logStep("ERROR renewing credits", { 
            user_id: credit.user_id, 
            error: renewError.message 
          });
          errors.push({ user_id: credit.user_id, error: renewError.message });
        } else {
          const skipped = result?.skipped === true;
          if (skipped) {
            logStep("Renewal skipped (already processed)", { user_id: credit.user_id });
          } else {
            renewedUsers.push(credit.user_id);
            logStep("Credits renewed successfully", { user_id: credit.user_id });
          }
        }
      }
    }

    logStep("Renewal complete", { 
      renewed: renewedUsers.length,
      errors: errors.length,
      total_checked: creditsToRenew?.length || 0
    });

    return new Response(JSON.stringify({
      success: true,
      renewed_count: renewedUsers.length,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in renew-credits", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});