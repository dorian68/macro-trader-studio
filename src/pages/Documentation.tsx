import PublicNavbar from "@/components/PublicNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, Code, Zap, BarChart3, TrendingUp, Shield } from "lucide-react";

export default function Documentation() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Documentation
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Everything you need to master Alphalens and maximize your trading insights
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <Tabs defaultValue="getting-started" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
              <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="ai-setup">AI Setup</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
            </TabsList>

            {/* Getting Started */}
            <TabsContent value="getting-started" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Book className="w-6 h-6 text-primary" />
                    <CardTitle>Quick Start Guide</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">1. Create Your Account</h3>
                    <p>Sign up with your email and start with a free trial to explore all features.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">2. Select Your Broker</h3>
                    <p>Choose your trading broker from our supported list to get tailored insights.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">3. Explore AI Features</h3>
                    <p>Use AI Trade Setup, Macro Commentary, and Reports to generate trading insights.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">4. Build Your Portfolio</h3>
                    <p>Add positions and receive AI-powered recommendations for optimization.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Understanding Credits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    Alphalens uses a credit-based system for AI-generated insights:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Trade Setup:</strong> 1 credit per AI-generated trade idea</li>
                    <li><strong>Macro Commentary:</strong> 1 credit per market analysis</li>
                    <li><strong>Reports:</strong> 1 credit per comprehensive report</li>
                  </ul>
                  <p className="mt-4">
                    Credits reset monthly based on your subscription plan. Unused credits do not roll over.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features */}
            <TabsContent value="features" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-primary" />
                    <CardTitle>AI Trade Setup</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    Generate intelligent trade ideas with entry points, stop losses, and take profit levels.
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Multi-timeframe technical analysis</li>
                    <li>Risk-reward ratio calculations</li>
                    <li>Real-time market data integration</li>
                    <li>Customizable analysis parameters</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <CardTitle>Macro Commentary</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    AI-powered analysis of macroeconomic trends and market sentiment.
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Economic indicator analysis</li>
                    <li>Sector rotation insights</li>
                    <li>Geopolitical impact assessment</li>
                    <li>Cross-asset correlations</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    <CardTitle>Comprehensive Reports</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    Generate detailed research reports on any asset or market.
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Fundamental and technical analysis</li>
                    <li>Earnings and financial data</li>
                    <li>Historical performance metrics</li>
                    <li>Export to PDF or email</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Setup */}
            <TabsContent value="ai-setup" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuring AI Trade Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">1. Select Your Asset</h3>
                    <p>Search for stocks, forex pairs, cryptocurrencies, or commodities using the search bar.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">2. Choose Timeframe</h3>
                    <p>Select from 1m, 5m, 15m, 1h, 4h, 1D, or 1W timeframes based on your trading style.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">3. Set Parameters</h3>
                    <p>Adjust risk tolerance, position size, and analysis depth to match your strategy.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">4. Generate Setup</h3>
                    <p>Click "Generate AI Setup" and receive your personalized trade idea within seconds.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Portfolio */}
            <TabsContent value="portfolio" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    Build and manage your investment portfolio with AI-powered insights.
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Add positions with entry price and quantity</li>
                    <li>Real-time P&L tracking and valuation</li>
                    <li>AI recommendations for portfolio optimization</li>
                    <li>Risk assessment and diversification analysis</li>
                    <li>Historical performance tracking</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API */}
            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Code className="w-6 h-6 text-primary" />
                    <CardTitle>API Access</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    Enterprise and Professional plans include API access for integration with your own systems.
                  </p>
                  <p>
                    For API documentation and access credentials, please contact our team at{" "}
                    <span className="font-semibold text-foreground">research@albaricg.com</span>
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ */}
            <TabsContent value="faq" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">How accurate are the AI predictions?</h3>
                    <p>
                      Our AI analyzes multiple data sources and technical indicators, but trading involves risk.
                      Always use our insights as one input in your decision-making process.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Can I cancel my subscription anytime?</h3>
                    <p>
                      Yes, you can cancel your subscription at any time from your account settings.
                      You'll retain access until the end of your billing period.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">What markets do you support?</h3>
                    <p>
                      We support global equities, forex, cryptocurrencies, commodities, and indices.
                      Coverage is continuously expanding.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Is my data secure?</h3>
                    <p>
                      Yes, we use industry-standard encryption and security practices. We never sell
                      your data to third parties.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground text-sm">
          <p>© 2025 alphaLens.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
