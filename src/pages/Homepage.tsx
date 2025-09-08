import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BarChart3, Brain, FileText, TrendingUp, Users, Shield, Zap, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Homepage() {
  const navigate = useNavigate();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoForm, setDemoForm] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });

  const handleDemoRequest = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Demo request submitted successfully! We'll contact you soon.");
    setShowDemoModal(false);
    setDemoForm({ name: "", email: "", company: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src="/lovable-uploads/e38d6c4f-1947-43bd-ba24-1b5604dac33a.png" alt="Alphalens" className="h-12" />
          </div>
          <div className="flex items-center space-x-4">
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
      <section className="relative py-24 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <img src="/lovable-uploads/e38d6c4f-1947-43bd-ba24-1b5604dac33a.png" alt="Alphalens" className="h-24 mx-auto mb-6" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Intelligent Financial Research
            <span className="text-accent"> Powered by AI</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Advanced FX, crypto, and macro analysis with institutional-grade insights, 
            AI-powered trade setups, and comprehensive research reports for financial professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-3 bg-primary hover:bg-primary/90"
              onClick={() => setShowDemoModal(true)}
            >
              Try Demo <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate("/auth")}
            >
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
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
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
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="h-8 w-8 text-accent" />
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

            <Card className="p-6 hover:shadow-lg transition-shadow border-border">
              <CardContent className="text-center p-0">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Target className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-foreground">Technical Analysis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  TradingView-integrated signals and indicators to validate trend, momentum, 
                  and key market levels.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Alphalens */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Why Financial Professionals Choose Alphalens
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Institutional Grade</h3>
              <p className="text-muted-foreground text-sm">
                Professional-level analysis trusted by trading firms and financial institutions
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Real-Time Insights</h3>
              <p className="text-muted-foreground text-sm">
                Live market analysis and trade signals updated continuously throughout trading hours
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Proven Accuracy</h3>
              <p className="text-muted-foreground text-sm">
                Track record of accurate market predictions and successful trade recommendations
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Expert Team</h3>
              <p className="text-muted-foreground text-sm">
                Developed by quantitative analysts and market experts with decades of experience
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">AI-Powered</h3>
              <p className="text-muted-foreground text-sm">
                Advanced machine learning algorithms analyze vast amounts of market data
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Multi-Asset</h3>
              <p className="text-muted-foreground text-sm">
                Comprehensive coverage across FX, crypto, commodities, and macro markets
              </p>
            </div>
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
            Join financial professionals who rely on Alphalens for superior market insights and trading decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-3"
              onClick={() => setShowDemoModal(true)}
            >
              Request Demo
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-3 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              onClick={() => navigate("/auth")}
            >
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
                <img src="/lovable-uploads/e38d6c4f-1947-43bd-ba24-1b5604dac33a.png" alt="Alphalens" className="h-8" />
              </div>
              <p className="text-muted-foreground text-sm">
                Professional financial research and trading intelligence powered by artificial intelligence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground text-sm">
            <p>&copy; 2024 Alphalens. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Demo</DialogTitle>
            <DialogDescription>
              Get a personalized demonstration of Alphalens' capabilities for your trading needs.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDemoRequest} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={demoForm.name}
                onChange={(e) => setDemoForm({...demoForm, name: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={demoForm.email}
                onChange={(e) => setDemoForm({...demoForm, email: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={demoForm.company}
                onChange={(e) => setDemoForm({...demoForm, company: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Tell us about your trading needs..."
                value={demoForm.message}
                onChange={(e) => setDemoForm({...demoForm, message: e.target.value})}
              />
            </div>
            <Button type="submit" className="w-full">
              Request Demo
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}