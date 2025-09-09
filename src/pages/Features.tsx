import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, BarChart3, FileText, Target, TrendingUp, Globe2, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Features() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "AI Trade Setups",
      description: "Advanced algorithms analyze market conditions to identify optimal entry and exit points with clear stop-loss, take-profit, and risk-reward rationales.",
      details: [
        "Directional signals with confidence scores",
        "Clear SL/TP levels with risk-reward ratios",
        "AI-powered trade rationales and market context",
        "Real-time signal updates and notifications"
      ],
      ctaText: "View Dashboard",
      ctaRoute: "/dashboard"
    },
    {
      icon: BarChart3,
      title: "Macro Commentary",
      description: "Institutional-grade macroeconomic analysis with integrated economic calendars and real-time market impact assessments.",
      details: [
        "Daily and weekly institutional research notes",
        "Integrated macroeconomic calendar with impact analysis",
        "Central bank policy tracking and implications",
        "Global market interconnection analysis"
      ],
      ctaText: "View Macro Analysis",
      ctaRoute: "/macro-analysis"
    },
    {
      icon: FileText,
      title: "Research Reports",
      description: "Comprehensive market analysis and research reports with PDF/HTML export capabilities and professional formatting.",
      details: [
        "Weekly and daily research briefs",
        "PDF and HTML export functionality",
        "Professional report formatting",
        "Historical report archive and search"
      ],
      ctaText: "View Reports",
      ctaRoute: "/reports"
    },
    {
      icon: Target,
      title: "Technical Analysis",
      description: "TradingView-integrated technical indicators with key level identification and trend momentum analysis.",
      details: [
        "Real-time technical indicators (RSI, MACD, ADX)",
        "Key support and resistance level identification",
        "Trend and momentum analysis",
        "Interactive TradingView chart integration"
      ],
      ctaText: "View Charts",
      ctaRoute: "/dashboard"
    }
  ];

  const additionalFeatures = [
    {
      icon: TrendingUp,
      title: "Portfolio Management",
      description: "Track your positions and get AI-powered recommendations for your portfolio optimization."
    },
    {
      icon: Globe2,
      title: "Multi-Asset Coverage",
      description: "FX, cryptocurrencies, and major indices with comprehensive market coverage."
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Live market data integration with instant notifications and alerts."
    },
    {
      icon: Shield,
      title: "Institutional Grade",
      description: "Professional-level analysis tools trusted by financial institutions worldwide."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src="/lovable-uploads/3b568e3e-a3d8-47d3-b8ca-4f500781b5e4.png" alt="alphaLens.ai" className="h-8" />
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              Home
            </Button>
            <Button variant="ghost" onClick={() => navigate("/about")}>
              About
            </Button>
            <Button variant="ghost" onClick={() => navigate("/contact")}>
              Contact
            </Button>
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Login
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Powerful Features for
            <span className="text-primary"> Professional Trading</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover the comprehensive suite of tools that make Alphalens the preferred choice 
            for financial professionals worldwide.
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-border bg-card">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start">
                        <span className="w-1 h-1 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => navigate(feature.ctaRoute)}
                  >
                    {feature.ctaText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16 px-4 bg-secondary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Additional capabilities that make Alphalens a complete solution for professional trading
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow border-border">
                <CardContent className="p-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Experience These Features?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of professionals who trust Alphalens for their trading decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8 py-3"
              onClick={() => navigate("/auth")}
            >
              Start Free Trial
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-3 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              onClick={() => navigate("/contact")}
            >
              Request Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src="/lovable-uploads/3b568e3e-a3d8-47d3-b8ca-4f500781b5e4.png" alt="alphaLens.ai" className="h-6" />
              </div>
              <p className="text-muted-foreground text-sm">
                Professional financial research and trading intelligence powered by artificial intelligence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/features")} className="hover:text-foreground transition-colors">Features</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Pricing</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">API</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/about")} className="hover:text-foreground transition-colors">About</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Contact</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Privacy</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Documentation</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Help Center</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Terms of Service</button></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground text-sm">
            <p>© 2025 Alphalens. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}