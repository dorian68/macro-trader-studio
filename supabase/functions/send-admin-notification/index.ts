import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  type: 'status_approved' | 'status_rejected' | 'credits_updated' | 'reactivation_request' | 'reactivation_approved' | 'reactivation_rejected';
  userEmail: string;
  userName: string;
  metadata?: any;
}

function getEmailContent(type: string, userName: string, metadata?: any): { subject: string; html: string } {
  const baseStyles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #002244 0%, #1e40af 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .logo {
      max-width: 200px;
      height: auto;
      margin-bottom: 10px;
    }
    .header-text {
      color: white;
      font-size: 16px;
      margin: 10px 0 0 0;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #002244;
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .content p {
      color: #4b5563;
      font-size: 16px;
      margin: 15px 0;
    }
    .highlight-box {
      background-color: #eff6ff;
      border-left: 4px solid #f97316;
      padding: 20px;
      margin: 25px 0;
      border-radius: 8px;
    }
    .highlight-box.success {
      background-color: #f0fdf4;
      border-left-color: #10b981;
    }
    .highlight-box.warning {
      background-color: #fef3c7;
      border-left-color: #f59e0b;
    }
    .highlight-box.info {
      background-color: #eff6ff;
      border-left-color: #3b82f6;
    }
    .credits-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .credits-table th,
    .credits-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .credits-table th {
      background-color: #f9fafb;
      font-weight: 600;
      color: #002244;
    }
    .credits-increase {
      color: #10b981;
      font-weight: 600;
    }
    .credits-decrease {
      color: #ef4444;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #002244 0%, #1e40af 100%);
      color: white !important;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #f97316;
      text-decoration: none;
    }
  `;

  switch (type) {
    case 'status_approved':
      return {
        subject: '🎉 Your Alphalens Account has been Approved!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Account Approved</title>
              <style>${baseStyles}</style>
            </head>
            <body>
              <div class="email-container">
                <div class="header">
                  <img src="https://jqrlegdulnnrpiixiecf.supabase.co/storage/v1/object/public/lovable-uploads/Full_logo_no_BG_2.png" alt="Alphalens AI" class="logo" />
                  <p class="header-text">Research Platform for Intelligent Trading</p>
                </div>
                <div class="content">
                  <h2>Welcome to Alphalens! 🚀</h2>
                  <p>Hello ${userName},</p>
                  <p>Great news! Your Alphalens account has been <strong>approved</strong> by our admin team.</p>
                  
                  <div class="highlight-box success">
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #10b981;">✅ Account Status: Approved</p>
                  </div>
                  
                  <p>You now have full access to all platform features:</p>
                  <ul style="color: #4b5563; line-height: 2;">
                    <li>AI-powered trade setups and analysis</li>
                    <li>Portfolio management tools</li>
                    <li>Real-time market insights</li>
                    <li>Custom reports and analytics</li>
                  </ul>
                  
                  <a href="https://alphalens.ai/dashboard" class="cta-button">
                    Access Your Dashboard →
                  </a>
                  
                  <p>If you have any questions, feel free to reach out to our support team.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Alphalens Research Platform. All rights reserved.</p>
                  <p><a href="https://alphalens.ai/privacy">Privacy Policy</a> | <a href="https://alphalens.ai/terms">Terms of Service</a></p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case 'status_rejected':
      return {
        subject: 'Update on Your Alphalens Account Application',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Account Status Update</title>
              <style>${baseStyles}</style>
            </head>
            <body>
              <div class="email-container">
                <div class="header">
                  <img src="https://jqrlegdulnnrpiixiecf.supabase.co/storage/v1/object/public/lovable-uploads/Full_logo_no_BG_2.png" alt="Alphalens AI" class="logo" />
                  <p class="header-text">Research Platform for Intelligent Trading</p>
                </div>
                <div class="content">
                  <h2>Account Application Update</h2>
                  <p>Hello ${userName},</p>
                  <p>Thank you for your interest in Alphalens Research Platform.</p>
                  
                  <div class="highlight-box warning">
                    <p style="margin: 0; font-size: 16px; color: #d97706;">Unfortunately, we are unable to approve your account at this time.</p>
                  </div>
                  
                  <p>This decision may be due to:</p>
                  <ul style="color: #4b5563;">
                    <li>Incomplete registration information</li>
                    <li>Verification requirements not met</li>
                    <li>Other administrative reasons</li>
                  </ul>
                  
                  <p>If you believe this is an error or would like to discuss your application, please contact our support team for assistance.</p>
                  
                  <a href="mailto:support@alphalens.ai" class="cta-button">
                    Contact Support →
                  </a>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Alphalens Research Platform. All rights reserved.</p>
                  <p><a href="https://alphalens.ai/privacy">Privacy Policy</a> | <a href="https://alphalens.ai/terms">Terms of Service</a></p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case 'credits_updated':
      const prev = metadata?.previousCredits || { queries: 0, ideas: 0, reports: 0 };
      const current = metadata?.newCredits || { queries: 0, ideas: 0, reports: 0 };
      
      const queriesDiff = current.queries - prev.queries;
      const ideasDiff = current.ideas - prev.ideas;
      const reportsDiff = current.reports - prev.reports;
      
      const getDiffDisplay = (diff: number) => {
        if (diff > 0) return `<span class="credits-increase">+${diff} ↑</span>`;
        if (diff < 0) return `<span class="credits-decrease">${diff} ↓</span>`;
        return '<span>No change</span>';
      };
      
      return {
        subject: '💳 Your Alphalens Credits Have Been Updated',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Credits Updated</title>
              <style>${baseStyles}</style>
            </head>
            <body>
              <div class="email-container">
                <div class="header">
                  <img src="https://jqrlegdulnnrpiixiecf.supabase.co/storage/v1/object/public/lovable-uploads/Full_logo_no_BG_2.png" alt="Alphalens AI" class="logo" />
                  <p class="header-text">Research Platform for Intelligent Trading</p>
                </div>
                <div class="content">
                  <h2>Your Credits Have Been Updated 💳</h2>
                  <p>Hello ${userName},</p>
                  <p>An administrator has updated your credit allocation${metadata?.planType ? ` for your <strong>${metadata.planType}</strong> plan` : ''}.</p>
                  
                  <div class="highlight-box info">
                    <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #002244;">Updated Credit Balance</p>
                    <table class="credits-table">
                      <thead>
                        <tr>
                          <th>Credit Type</th>
                          <th>Previous</th>
                          <th>Current</th>
                          <th>Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Queries</strong></td>
                          <td>${prev.queries}</td>
                          <td><strong>${current.queries}</strong></td>
                          <td>${getDiffDisplay(queriesDiff)}</td>
                        </tr>
                        <tr>
                          <td><strong>Ideas (AI Trade Setups)</strong></td>
                          <td>${prev.ideas}</td>
                          <td><strong>${current.ideas}</strong></td>
                          <td>${getDiffDisplay(ideasDiff)}</td>
                        </tr>
                        <tr>
                          <td><strong>Reports</strong></td>
                          <td>${prev.reports}</td>
                          <td><strong>${current.reports}</strong></td>
                          <td>${getDiffDisplay(reportsDiff)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <p>You can start using your updated credits right away by accessing your dashboard.</p>
                  
                  <a href="https://alphalens.ai/dashboard" class="cta-button">
                    Go to Dashboard →
                  </a>
                  
                  <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Need more credits? Contact your account manager or upgrade your plan.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Alphalens Research Platform. All rights reserved.</p>
                  <p><a href="https://alphalens.ai/privacy">Privacy Policy</a> | <a href="https://alphalens.ai/terms">Terms of Service</a></p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

    case 'reactivation_request':
      const { userEmail, brokerName, deletedAt } = metadata || {};
      return {
        subject: '🔔 New Account Reactivation Request - Alphalens',
        html: `
          <!DOCTYPE html>
          <html>
            <head><style>${baseStyles}</style></head>
            <body>
              <div class="email-container">
                <div class="header">
                  <p class="header-text">Alphalens Admin Panel</p>
                </div>
                <div class="content">
                  <h2>🔔 New Reactivation Request</h2>
                  <p>A user has requested to reactivate their soft-deleted account.</p>
                  
                  <div class="highlight-box info">
                    <strong>Request Details:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                      <li><strong>User Email:</strong> ${userEmail}</li>
                      <li><strong>Broker:</strong> ${brokerName || 'N/A'}</li>
                      <li><strong>Account Deleted:</strong> ${deletedAt ? new Date(deletedAt).toLocaleDateString() : 'Unknown'}</li>
                      <li><strong>Request Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                  </div>

                  <p style="text-align: center;">
                    <a href="https://alphalensai.com/admin?tab=reactivations" class="cta-button">
                      Review Request in Admin Panel →
                    </a>
                  </p>

                  <p style="font-size: 14px; color: #6b7280;">Please review this request and take appropriate action.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Alphalens. All rights reserved.</p>
                  <p>This is an automated notification for administrators.</p>
                </div>
              </div>
            </body>
          </html>
        `
      };

    case 'reactivation_approved':
      return {
        subject: '✅ Your Alphalens Account Has Been Reactivated!',
        html: `
          <!DOCTYPE html>
          <html>
            <head><style>${baseStyles}</style></head>
            <body>
              <div class="email-container">
                <div class="header">
                  <p class="header-text">Welcome Back to Alphalens!</p>
                </div>
                <div class="content">
                  <h2>✅ Great News, ${userName}!</h2>
                  <p>Your reactivation request has been approved. Your Alphalens account is now active again.</p>
                  
                  <div class="highlight-box success">
                    <strong>What's Next?</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                      <li>Sign in to access your account</li>
                      <li>Continue using our AI-powered trading tools</li>
                      <li>Get real-time market insights</li>
                    </ul>
                  </div>

                  <p style="text-align: center;">
                    <a href="https://alphalensai.com/auth" class="cta-button">
                      Sign In Now →
                    </a>
                  </p>

                  <p>We're glad to have you back!</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Alphalens. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `
      };

    case 'reactivation_rejected':
      const { rejectionReason } = metadata || {};
      return {
        subject: '❌ Update on Your Account Reactivation Request',
        html: `
          <!DOCTYPE html>
          <html>
            <head><style>${baseStyles}</style></head>
            <body>
              <div class="email-container">
                <div class="header">
                  <p class="header-text">Alphalens Account Update</p>
                </div>
                <div class="content">
                  <h2>Hello ${userName},</h2>
                  <p>Thank you for your reactivation request.</p>
                  
                  <p>Unfortunately, we are unable to reactivate your account at this time.</p>

                  ${rejectionReason ? `
                  <div class="highlight-box warning">
                    <strong>Reason:</strong>
                    <p style="margin: 10px 0;">${rejectionReason}</p>
                  </div>
                  ` : ''}

                  <div class="highlight-box info">
                    <strong>Need Help?</strong>
                    <p style="margin: 10px 0;">If you have questions about this decision or need assistance, please contact our support team at <a href="mailto:support@alphalens.ai" style="color: #f97316;">support@alphalens.ai</a></p>
                  </div>

                  <p>We appreciate your understanding.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Alphalens. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `
      };

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, notificationType, userName, metadata }: AdminNotificationRequest = await req.json();

    if (!to || !notificationType) {
      throw new Error('Missing required fields: to, notificationType');
    }

    console.log(`📧 [Admin Notification] Sending ${notificationType} to:`, to);

    const { subject, html } = getEmailContent(notificationType, userName || to, metadata);

    const emailResponse = await resend.emails.send({
      from: "Alphalens Platform <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    console.log("✅ [Admin Notification] Email sent successfully:", emailResponse.id);

    return new Response(JSON.stringify({ 
      success: true,
      messageId: emailResponse.id,
      notificationType
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ [Admin Notification] Error sending email:", error);
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
