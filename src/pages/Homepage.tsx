import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  FileText, 
  Brain, 
  LineChart,
  Shield,
  Zap,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Activity,
  AlertTriangle
} from 'lucide-react';
import alphalensLogo from '@/assets/alphalens-logo.png';

export default function Homepage() {
  const [demoFormData, setDemoFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Add backend endpoint for demo requests
      console.warn('TODO: Implement demo request endpoint', demoFormData);
      
      toast({
        title: "Demo Request Submitted",
        description: "We'll get back to you shortly."
      });
      
      setDemoFormData({ name: '', email: '', company: '', message: '' });
      setIsModalOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit demo request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Macro & Market Commentary",
      description: "Institutional-style outlooks powered by GPT + ABCG Research"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: "Technical Analysis Integration", 
      description: "TradingView-like signals + indicators to validate trend/momentum/levels"
    },
    {
      icon: <Target className="h-8 w-8 text-primary" />,
      title: "Trade Idea Cards (SL/TP/RR)",
      description: "Directional setups with stop-loss, take-profit, and risk/reward rationale"
    },
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: "Report/Brief Generator",
      description: "Daily/weekly briefs, exportable PDF/HTML, research cards"
    }
  ];

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div 
          className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent/10 opacity-50"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-success/10 rounded-full blur-xl animate-pulse delay-300" />
        
        <div className="relative max-w-6xl mx-auto text-center z-10">
          {/* Logo with Animation */}
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="relative">
              <img 
                src={alphalensLogo} 
                alt="alphalens.ai" 
                className="h-20 w-auto drop-shadow-lg hover:scale-105 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-3xl -z-10" />
            </div>
          </div>
          
          {/* Hero Title */}
          <div className="space-y-6 mb-12">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-foreground to-accent bg-clip-text text-transparent leading-tight animate-fade-in">
              alphalens.ai
            </h1>
            <div className="flex items-center justify-center gap-2 animate-fade-in delay-200">
              <Sparkles className="h-6 w-6 text-accent animate-pulse" />
              <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                Intelligent FX, Crypto & Macro Research — Powered by AI & Institutional Insights
              </p>
              <Sparkles className="h-6 w-6 text-primary animate-pulse delay-500" />
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in delay-400">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="lg" 
                  className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-glow-primary hover:shadow-xl transition-all duration-300 group"
                >
                  Request Demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-center">Request Demo</DialogTitle>
                  <DialogDescription className="text-center">
                    Get a personalized demo of alphalens.ai for your team.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="demo-name">Name *</Label>
                    <Input
                      id="demo-name"
                      value={demoFormData.name}
                      onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-email">Email *</Label>
                    <Input
                      id="demo-email"
                      type="email"
                      value={demoFormData.email}
                      onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-company">Company/Broker</Label>
                    <Input
                      id="demo-company"
                      value={demoFormData.company}
                      onChange={(e) => setDemoFormData({ ...demoFormData, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-message">Message</Label>
                    <Textarea
                      id="demo-message"
                      value={demoFormData.message}
                      onChange={(e) => setDemoFormData({ ...demoFormData, message: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            
            <div className="flex gap-4">
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300" asChild>
                <Link to="/auth">Sign Up</Link>
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg hover:bg-accent hover:text-accent-foreground transition-all duration-300" asChild>
                <Link to="/auth">Login</Link>
              </Button>
            </div>
          </div>
          
          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <ChevronDown className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* Problem/Solution Narrative */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background-secondary">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Problem */}
            <div className="space-y-6 animate-fade-in">
              <div className="inline-flex items-center px-4 py-2 bg-danger/10 text-danger rounded-full text-sm font-medium">
                <AlertTriangle className="h-4 w-4 mr-2" />
                The Challenge
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Drowning in Data,<br />Starving for Insights
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Financial markets generate overwhelming amounts of data. Traders and analysts spend hours sifting through 
                scattered information, struggling to identify actionable opportunities while market conditions change rapidly.
              </p>
            </div>
            
            {/* Solution */}
            <div className="space-y-6 animate-fade-in delay-200">
              <div className="inline-flex items-center px-4 py-2 bg-success/10 text-success rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4 mr-2" />
                Our Solution
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                AI-Powered Analysis<br />at Institutional Scale
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                alphalens.ai combines cutting-edge AI with institutional research expertise, delivering 
                precise trade setups, macro commentary, and research reports that transform complexity into clarity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Powerful Features for Modern Traders
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience institutional-grade analysis tools designed for today's fast-moving markets
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card-secondary hover:shadow-strong transition-all duration-500 hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="relative z-10">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl text-center group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <CardDescription className="text-center text-muted-foreground group-hover:text-foreground transition-colors">
                    {feature.description}
                  </CardDescription>
                  <div className="mt-4 flex justify-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-primary hover:bg-primary hover:text-primary-foreground"
                      asChild
                    >
                      <Link to="/dashboard">
                        Explore <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background-secondary">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Powered by Expert Collaboration
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              A strategic partnership combining AI innovation with institutional research excellence
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Card className="p-8 h-full bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-glow-primary transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-primary">OptiQuant IA</h3>
                  <p className="text-muted-foreground">Quantitative AI Specialists</p>
                </div>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Leading experts in quantitative finance, artificial intelligence, and intelligent decision-making tools for businesses.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href="https://www.optiquant-ia.com/" target="_blank" rel="noopener noreferrer">
                  Visit OptiQuant IA <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </Card>
            
            <Card className="p-8 h-full bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 hover:shadow-glow-success transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-accent/10 rounded-xl">
                  <Activity className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-accent">ABCG Research</h3>
                  <p className="text-muted-foreground">Macroeconomic Research</p>
                </div>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Leading macroeconomic research and financial insights firm delivering institutional-grade analysis and market intelligence.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href="https://research.albaricg.com/" target="_blank" rel="noopener noreferrer">
                  Visit ABCG Research <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </Card>
          </div>
          
          <div className="mt-16 text-center">
            <Card className="p-8 bg-gradient-to-r from-primary/5 via-background to-accent/5">
              <h3 className="text-2xl font-bold text-foreground mb-4">Our Mission</h3>
              <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                Delivering institutional-grade macro analysis enriched with AI-driven insights and real-time data. 
                We combine OptiQuant IA's quantitative expertise with ABCG Research's market intelligence to provide 
                traders and analysts with the clarity they need to make confident decisions.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Strip */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary to-accent p-12 rounded-3xl text-white shadow-strong">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Trading Analysis?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Join institutional traders and analysts who trust alphalens.ai for their market insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="px-8 py-4 text-lg font-semibold bg-white text-primary hover:bg-white/90 shadow-medium"
                  >
                    Request Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Request Demo</DialogTitle>
                    <DialogDescription className="text-center">
                      Get a personalized demo of alphalens.ai for your team.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleDemoSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cta-demo-name">Name *</Label>
                      <Input
                        id="cta-demo-name"
                        value={demoFormData.name}
                        onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cta-demo-email">Email *</Label>
                      <Input
                        id="cta-demo-email"
                        type="email"
                        value={demoFormData.email}
                        onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cta-demo-company">Company/Broker</Label>
                      <Input
                        id="cta-demo-company"
                        value={demoFormData.company}
                        onChange={(e) => setDemoFormData({ ...demoFormData, company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cta-demo-message">Message</Label>
                      <Textarea
                        id="cta-demo-message"
                        value={demoFormData.message}
                        onChange={(e) => setDemoFormData({ ...demoFormData, message: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-primary" 
                asChild
              >
                <Link to="/auth">Start Free Trial</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background-secondary">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
            Trusted by Financial Professionals
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed">
            Built with transparency standards and data provenance at its core, delivering institutional-grade 
            analysis that brokers, portfolio managers, and analysts trust for critical trading decisions.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="p-8 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
              <div className="text-3xl font-bold text-success mb-2">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime Reliability</div>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="text-3xl font-bold text-primary mb-2">&lt;2s</div>
              <div className="text-sm text-muted-foreground">Analysis Response Time</div>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
              <div className="text-3xl font-bold text-accent mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Market Coverage</div>
            </Card>
          </div>
          
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full">
            <Shield className="h-5 w-5 text-primary mr-2" />
            <span className="text-foreground font-medium">
              Enterprise-grade security & compliance ready
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border bg-background-secondary">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src={alphalensLogo} 
                  alt="alphalens.ai" 
                  className="h-10 w-auto"
                />
              </div>
              <p className="text-muted-foreground text-center md:text-left max-w-md">
                Intelligent financial analysis powered by AI and institutional research expertise.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-8 text-muted-foreground">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-primary transition-fast font-medium">Request Demo</button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Request Demo</DialogTitle>
                    <DialogDescription className="text-center">
                      Get a personalized demo of alphalens.ai for your team.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleDemoSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="footer-demo-name">Name *</Label>
                      <Input
                        id="footer-demo-name"
                        value={demoFormData.name}
                        onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footer-demo-email">Email *</Label>
                      <Input
                        id="footer-demo-email"
                        type="email"
                        value={demoFormData.email}
                        onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footer-demo-company">Company/Broker</Label>
                      <Input
                        id="footer-demo-company"
                        value={demoFormData.company}
                        onChange={(e) => setDemoFormData({ ...demoFormData, company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footer-demo-message">Message</Label>
                      <Textarea
                        id="footer-demo-message"
                        value={demoFormData.message}
                        onChange={(e) => setDemoFormData({ ...demoFormData, message: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Link to="/auth" className="hover:text-primary transition-fast font-medium">
                Sign Up
              </Link>
              <Link to="/auth" className="hover:text-primary transition-fast font-medium">
                Login
              </Link>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border text-center">
            <p className="text-muted-foreground text-sm">
              © 2024 alphalens.ai - A collaboration between OptiQuant IA and ABCG Research
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}