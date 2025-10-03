import PublicNavbar from "@/components/PublicNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Last updated: January 2025
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>1. Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  By accessing and using Alphalens.ai ("the Service"), you accept and agree
                  to be bound by these Terms of Service. If you do not agree to these terms,
                  please do not use our Service.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Service Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Alphalens.ai provides AI-powered financial research, trading insights,
                  and portfolio analysis tools. Our Service includes:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>AI-generated trade setups and market analysis</li>
                  <li>Macro commentary and economic insights</li>
                  <li>Portfolio management and risk assessment tools</li>
                  <li>Real-time market data and technical indicators</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. User Responsibilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>You agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Use the Service in compliance with all applicable laws</li>
                  <li>Not attempt to reverse engineer or exploit the Service</li>
                  <li>Not share your account with unauthorized parties</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Investment Disclaimer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p className="font-semibold text-foreground">
                  IMPORTANT: Trading and investing involve substantial risk of loss.
                </p>
                <p>
                  Alphalens.ai provides informational content and analytical tools only.
                  We do not provide investment advice, and our AI-generated insights should
                  not be construed as financial recommendations. You are solely responsible
                  for your trading decisions and their outcomes.
                </p>
                <p>
                  Past performance does not guarantee future results. Always conduct your
                  own research and consult with qualified financial advisors before making
                  investment decisions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Subscription and Billing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Subscriptions are billed monthly or annually in advance</li>
                  <li>Free trial periods do not require payment information</li>
                  <li>You may cancel your subscription at any time</li>
                  <li>Refunds are provided at our discretion on a case-by-case basis</li>
                  <li>Credit allocations reset monthly based on your plan</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  All content, features, and functionality of Alphalens.ai are owned by us
                  and are protected by international copyright, trademark, and other
                  intellectual property laws. You may not copy, modify, distribute, or
                  create derivative works without our express written permission.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  To the maximum extent permitted by law, Alphalens.ai shall not be liable
                  for any indirect, incidental, special, consequential, or punitive damages,
                  including loss of profits, data, or trading losses, arising from your use
                  of the Service.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Service Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We strive to maintain 99.9% uptime, but we do not guarantee uninterrupted
                  access to the Service. We may modify, suspend, or discontinue any aspect
                  of the Service at any time with reasonable notice.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  For questions about these Terms of Service, please contact us at:
                </p>
                <p className="font-semibold text-foreground">
                  Email: research@albaricg.com
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-4xl text-center text-muted-foreground text-sm">
          <p>© 2025 alphaLens.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
