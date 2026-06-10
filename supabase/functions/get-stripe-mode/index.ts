import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { user, error: authError, status } = await requireRole(req, ['super_user']);
    if (!user) {
      return new Response(JSON.stringify({ error: authError }), {
        status: status ?? 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const mode = Deno.env.get("STRIPE_MODE") || "test";
    
    return new Response(
      JSON.stringify({ mode }), 
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), 
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
