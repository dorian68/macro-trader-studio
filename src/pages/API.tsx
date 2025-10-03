import PublicNavbar from "@/components/PublicNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Zap, Shield, TrendingUp, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function API() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Alphalens API
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Integrate our AI-powered trading insights directly into your applications,
            trading bots, and investment platforms
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/contact")}
            className="gap-2"
          >
            <Mail className="w-5 h-5" />
            Request API Access
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            API Capabilities
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Real-Time Trade Signals</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                <p>
                  Access AI-generated trade setups, entry/exit points, and risk parameters
                  programmatically for automated trading systems.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Market Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                <p>
                  Query macro commentary, sentiment analysis, and market insights across
                  multiple asset classes and timeframes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Code className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Portfolio Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                <p>
                  Programmatically manage portfolios, retrieve AI recommendations,
                  and track performance metrics via RESTful endpoints.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Enterprise Security</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                <p>
                  OAuth 2.0 authentication, rate limiting, IP whitelisting, and
                  comprehensive audit logging for enterprise deployments.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-16 px-4 bg-secondary/5">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">
            Quick Example
          </h2>

          <Card>
            <CardHeader>
              <CardTitle>Generate AI Trade Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-6 rounded-lg overflow-x-auto">
                <code className="text-sm text-foreground">{`// Initialize Alphalens API Client
const alphalens = new AlphalensAPI({
  apiKey: 'your_api_key_here',
  environment: 'production'
});

// Generate AI trade setup for EUR/USD
const tradeSetup = await alphalens.ai.generateSetup({
  symbol: 'EURUSD',
  timeframe: '1h',
  riskTolerance: 'medium',
  analysisDepth: 'comprehensive'
});

// Response
{
  "symbol": "EURUSD",
  "direction": "LONG",
  "entryPrice": 1.0850,
  "stopLoss": 1.0820,
  "takeProfit": [1.0900, 1.0950],
  "riskReward": 2.5,
  "confidence": 0.78,
  "reasoning": "Strong bullish momentum...",
  "technicalIndicators": {...},
  "timestamp": "2025-01-10T12:00:00Z"
}`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing & Access */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">
            API Access Plans
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Professional API</CardTitle>
                <p className="text-muted-foreground mt-2">For individual developers and small teams</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-foreground">Contact Us</div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ 10,000 API calls/month</li>
                  <li>✓ All AI features access</li>
                  <li>✓ Rate limit: 100 req/min</li>
                  <li>✓ Email support</li>
                  <li>✓ REST API access</li>
                </ul>
                <Button onClick={() => navigate("/contact")} className="w-full">
                  Request Access
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Enterprise API</CardTitle>
                <p className="text-muted-foreground mt-2">For institutions and high-volume usage</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-foreground">Custom Pricing</div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ Unlimited API calls</li>
                  <li>✓ Custom rate limits</li>
                  <li>✓ Dedicated support</li>
                  <li>✓ SLA guarantee (99.9%)</li>
                  <li>✓ WebSocket streaming</li>
                  <li>✓ On-premise deployment option</li>
                </ul>
                <Button onClick={() => navigate("/contact")} className="w-full">
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Documentation */}
      <section className="py-16 px-4 bg-secondary/5">
        <div className="container mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">Ready to Get Started?</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-muted-foreground">
                Contact our team to discuss your API requirements, receive credentials,
                and access comprehensive documentation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate("/contact")}
                  className="gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Request API Access
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/documentation")}
                  className="gap-2"
                >
                  <Code className="w-5 h-5" />
                  View Documentation
                </Button>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  For API inquiries:{" "}
                  <span className="font-semibold text-foreground">research@albaricg.com</span>
                </p>
              </div>
            </CardContent>
          </Card>
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
