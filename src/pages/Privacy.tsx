import PublicNavbar from "@/components/PublicNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Privacy Policy
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
                <CardTitle>1. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We collect information you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Account information (name, email, company details)</li>
                  <li>Trading preferences and portfolio data</li>
                  <li>Usage data and interaction with our AI features</li>
                  <li>Payment information (processed securely through Stripe)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Generate personalized AI-driven trading insights</li>
                  <li>Process your transactions and manage subscriptions</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Communicate about products, features, and updates</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Data Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We implement robust security measures to protect your data:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>End-to-end encryption for sensitive financial data</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Secure cloud infrastructure with Supabase</li>
                  <li>Strict access controls and authentication protocols</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Data Sharing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We do not sell your personal information. We may share your data only:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>With your explicit consent</li>
                  <li>With service providers who assist our operations</li>
                  <li>To comply with legal obligations</li>
                  <li>With your broker if you've linked your account</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Your Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access and download your personal data</li>
                  <li>Correct inaccurate or incomplete information</li>
                  <li>Request deletion of your account and data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Export your trading history and portfolio data</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Cookies and Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We use cookies and similar technologies to improve user experience,
                  analyze usage patterns, and maintain session security. You can control
                  cookie preferences through your browser settings.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  If you have questions about this Privacy Policy or our data practices,
                  please contact us at:
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
