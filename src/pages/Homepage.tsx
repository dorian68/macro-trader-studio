import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BarChart3, Brain, FileText, TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "@/components/PublicNavbar";
export default function Homepage() {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative py-24 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <img src="/lovable-uploads/Full_logo_no_BG_2.png" alt="alphaLens.ai" className="h-96 mx-auto mb-6" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Intelligent Financial Research
            <span className="text-primary"> Powered by AI</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Advanced FX, crypto, and macro analysis with institutional-grade insights, 
            AI-powered trade setups, and comprehensive research reports for financial professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-lg px-8 py-3 bg-primary hover:bg-primary/90" onClick={() => navigate("/contact")}>
              Try Demo <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Product Features */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Professional Trading Intelligence
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools and insights designed for traders, analysts, and financial institutions
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 justify-items-center">
            <Card className="p-6 hover:shadow-lg transition-shadow border-border">
              <CardContent className="text-center p-0">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-foreground">AI Trade Setups</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Advanced algorithms analyze market conditions to identify optimal entry and exit points 
                  across FX and crypto markets.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-border">
              <CardContent className="text-center p-0">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-foreground">Macro Commentary</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Real-time analysis of global economic events and their impact on financial markets 
                  with actionable insights.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-border">
              <CardContent className="text-center p-0">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-foreground">Research Reports</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Comprehensive market analysis and research reports backed by institutional-grade 
                  data and expert insights.
                </p>
              </CardContent>
            </Card>

            
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Trading Strategy?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join financial professionals who rely on alphaLens.ai for superior market insights and trading decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3" onClick={() => navigate("/contact")}>
              Request Demo
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" onClick={() => navigate("/auth")}>
              Start Free Trial
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
                <li><button onClick={() => navigate("/pricing")} className="hover:text-foreground transition-colors">Pricing</button></li>
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
            <p>© 2025 alphaLens.ai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>;
}