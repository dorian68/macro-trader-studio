import { useState } from 'react';
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
  Zap
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background-secondary to-background-tertiary" />
        
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            {/* Alphalens Logo */}
            <div className="flex justify-center mb-8">
              <img 
                src={alphalensLogo} 
                alt="Alphalens" 
                className="h-16 w-auto"
              />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Alphalens — Macro/FX/Crypto Analysis Assistant
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto">
              Institutional-grade trade ideas and research insights across macro, FX, crypto, and commodities.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="px-8 py-4 text-lg">
                    Request Demo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Request Demo</DialogTitle>
                    <DialogDescription>
                      Get a personalized demo of Alphalens for your team.
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
              
              <div className="flex gap-3">
                <Button variant="outline" size="lg" asChild>
                  <Link to="/auth">Sign Up</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/auth">Login</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is Alphalens Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What is Alphalens?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Advanced AI-powered analysis platform combining quantitative expertise with institutional research
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="text-center p-6">
              <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Macro & Market Commentary Generator</h3>
              <p className="text-muted-foreground">Institutional-style outlooks powered by GPT + ABCG Research</p>
            </Card>
            
            <Card className="text-center p-6">
              <LineChart className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Technical Analysis Integration</h3>
              <p className="text-muted-foreground">TradingView-like signals + indicators to validate trend/momentum/levels</p>
            </Card>
            
            <Card className="text-center p-6">
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Trade Idea Recommender</h3>
              <p className="text-muted-foreground">Directional setups with SL/TP, R/R and rationale</p>
            </Card>
          </div>
        </div>
      </section>

      {/* MVP Focus Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              MVP Focus
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Asset Coverage</h3>
              <ul className="space-y-3 text-lg">
                <li className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-primary" />
                  FX Majors (EUR/USD, GBP/USD, USD/JPY, etc.)
                </li>
                <li className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-primary" />
                  Commodities (Gold, Silver, Crude Oil)
                </li>
                <li className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-primary" />
                  Crypto (Bitcoin, Ethereum)
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold mb-6">Collaboration</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold">OptiQuant IA</h4>
                    <p className="text-muted-foreground">Architecture, RAG, UI/Infrastructure</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold">ABCG Research</h4>
                    <p className="text-muted-foreground">Proprietary research, validation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Key Features
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-medium transition-smooth">
                <CardHeader className="pb-4">
                  <div className="flex justify-center mb-3">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background-secondary">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            Trusted by Brokers, PMs & Analysts
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
            Built with transparency standards and data provenance at its core, 
            delivering institutional-grade analysis you can trust.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img 
                src={alphalensLogo} 
                alt="Alphalens" 
                className="h-8 w-auto"
              />
            </div>
            
            <div className="flex flex-wrap gap-6 text-muted-foreground">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-foreground transition-fast">Request Demo</button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Request Demo</DialogTitle>
                    <DialogDescription>
                      Get a personalized demo of Alphalens for your team.
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
              
              <Link to="/auth" className="hover:text-foreground transition-fast">
                Sign Up
              </Link>
              <Link to="/auth" className="hover:text-foreground transition-fast">
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}