import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  company?: string;
  message: string;
  website?: string;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

async function hashValue(value: string): Promise<string> {
  const salt = Deno.env.get("CONTACT_RATE_LIMIT_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { name, email, company, message, website }: ContactRequest = await req.json();
    if (website) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      typeof name !== "string" || !name.trim() || name.length > 120 ||
      typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof message !== "string" || !message.trim() || message.length > 10_000 ||
      (company !== undefined && (typeof company !== "string" || company.length > 200))
    ) {
      return new Response(JSON.stringify({ error: "Invalid contact request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ipHash = await hashValue(req.headers.get("cf-connecting-ip") || forwardedFor || "unknown");
    const { data: rateLimitAllowed, error: rateLimitError } = await supabase.rpc(
      "check_contact_rate_limit_service",
      {
        p_ip_hash: ipHash,
        p_limit: 5,
        p_window: "15 minutes",
      },
    );
    if (rateLimitError) throw rateLimitError;
    if (rateLimitAllowed !== true) {
      return new Response(JSON.stringify({ error: "Too many contact requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabase.from("contact_form_attempts").delete().lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    console.log("Sending contact email from:", email);
    const safeName = escapeHtml(name.trim());
    const safeEmail = escapeHtml(email.trim());
    const safeCompany = company ? escapeHtml(company.trim()) : "";
    const safeMessage = escapeHtml(message.trim()).replace(/\n/g, '<br>');

    const emailResponse = await resend.emails.send({
      from: "Alphalens Contact <onboarding@resend.dev>",
      to: ["dorian.labry@optiquant-ia.com", "research@albaricg.com"],
      reply_to: email.trim(),
      subject: `New Contact Form Submission from ${name.trim().replace(/[\r\n]/g, " ")}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        ${safeCompany ? `<p><strong>Company:</strong> ${safeCompany}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error sending contact email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
