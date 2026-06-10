import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import sanitizeHtml from "npm:sanitize-html@2.17.0";
import {
  consumeProductCredit,
  refundProductCredit,
  requireProductAccess,
} from "../_shared/auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportEmailRequest {
  to: string;
  reportTitle: string;
  htmlContent: string;
  assetSymbol?: string;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
})[character]!);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let consumedCredit: { userId: string; referenceId: string } | null = null;

  try {
    const { user, error: authError, status } = await requireProductAccess(req, 'reports');
    if (!user?.email || !user.email_confirmed_at) {
      return new Response(JSON.stringify({ error: authError || 'Verified email required' }), {
        status: status ?? 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, reportTitle, htmlContent, assetSymbol }: ReportEmailRequest = await req.json();
    if (
      typeof to !== 'string' ||
      typeof reportTitle !== 'string' ||
      typeof htmlContent !== 'string' ||
      (assetSymbol !== undefined && typeof assetSymbol !== 'string')
    ) {
      return new Response(JSON.stringify({ error: 'Invalid report email request' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (to.toLowerCase() !== user.email.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'Reports can only be sent to your verified account email' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      !reportTitle.trim() ||
      reportTitle.length > 200 ||
      /[\r\n]/.test(reportTitle) ||
      !htmlContent ||
      htmlContent.length > 500_000 ||
      (assetSymbol && (assetSymbol.length > 50 || /[\r\n]/.test(assetSymbol)))
    ) {
      return new Response(JSON.stringify({ error: 'Invalid report email request' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const consumed = await consumeProductCredit(user.id, 'reports', 'send-report-email');
    if (!consumed.success) {
      return new Response(JSON.stringify({ error: consumed.error }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    consumedCredit = { userId: user.id, referenceId: consumed.referenceId };

    const safeTitle = escapeHtml(reportTitle.trim());
    const safeAssetSymbol = assetSymbol ? escapeHtml(assetSymbol.trim()) : '';
    const safeReportHtml = sanitizeHtml(htmlContent, {
      allowedTags: [
        'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4',
        'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'span', 'strong',
        'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
      ],
      allowedAttributes: {
        '*': ['class', 'style'],
        a: ['href', 'rel', 'target'],
        img: ['alt', 'height', 'src', 'title', 'width'],
        td: ['colspan', 'rowspan'],
        th: ['colspan', 'rowspan'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
      },
    });

    console.log("📧 Sending report email to:", to);

    const emailResponse = await resend.emails.send({
      from: "Alphalens Reports <onboarding@resend.dev>",
      to: [to],
      subject: assetSymbol 
        ? `${reportTitle} - ${assetSymbol}`
        : reportTitle,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${safeTitle}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
              }
              .email-container {
                background-color: white;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                border-bottom: 3px solid #2563eb;
                padding-bottom: 15px;
                margin-bottom: 25px;
              }
              .header h1 {
                margin: 0;
                color: #1e40af;
                font-size: 24px;
              }
              .content {
                margin-top: 20px;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #6b7280;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>${safeTitle}</h1>
                ${safeAssetSymbol ? `<p style="color: #6b7280; margin: 5px 0 0 0;">Target Asset: ${safeAssetSymbol}</p>` : ''}
              </div>
              <div class="content">
                ${safeReportHtml}
              </div>
              <div class="footer">
                <p>This report was generated by Alphalens Research Platform</p>
                <p>© ${new Date().getFullYear()} Alphalens. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    if (emailResponse.error || !emailResponse.data?.id) {
      throw new Error(emailResponse.error?.message || 'Email provider did not confirm delivery');
    }

    console.log("✅ Report email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      messageId: emailResponse.data.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error sending report email:", error);
    if (consumedCredit) {
      const refund = await refundProductCredit(
        consumedCredit.userId,
        'reports',
        'send-report-email-failed',
        consumedCredit.referenceId,
      );
      if (!refund.success) {
        console.error("❌ Failed to refund report credit:", refund.error);
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
