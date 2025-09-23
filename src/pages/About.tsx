import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Building2, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "@/components/PublicNavbar";

export default function About() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="max-w-4xl mx-auto space-y-6 px-4 py-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <img src="/lovable-uploads/Full_logi_white_BG_FINAL-2.png" alt="alphaLens.ai" className="h-[4.2rem] w-auto mx-auto" />
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            About
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A joint collaboration between OptiQuant IA and ABCG Research, delivering institutional-grade financial intelligence.
          </p>
        </div>

        {/* Company Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* OptiQuant IA Card */}
          <Card className="gradient-card border-primary/20 shadow-glow-primary">
            <CardHeader className="text-center pb-4">
              <img src="/lovable-uploads/optiquant-logo.png" alt="OptiQuant IA" className="h-14 w-auto mx-auto mb-4" />
              <CardTitle className="text-xl text-foreground">OptiQuant IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                OptiQuant IA is a leading company specializing in quantitative finance, artificial intelligence, 
                and intelligent decision-making tools for businesses. We develop cutting-edge AI solutions that 
                transform how financial institutions analyze markets and make strategic decisions.
              </p>
              <p className="text-muted-foreground">
                Our expertise lies in creating sophisticated algorithms and machine learning models that provide 
                actionable insights for trading, risk management, and portfolio optimization.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('https://www.optiquant-ia.com/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit OptiQuant IA
              </Button>
            </CardContent>
          </Card>

          {/* ABCG Research Card */}
          <Card className="gradient-card border-primary/20 shadow-glow-primary">
            <CardHeader className="text-center pb-4">
              <img src="/lovable-uploads/abcg-research-logo.png" alt="ABCG Research" className="h-10 w-auto mx-auto mb-4" />
              <CardTitle className="text-xl text-foreground">ABCG Research</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                ABCG Research is a leading macroeconomic research and financial insights firm, providing 
                institutional-grade analysis to professional investors, corporations, and financial institutions 
                worldwide.
              </p>
              <p className="text-muted-foreground">
                With deep expertise in global macroeconomic trends, market dynamics, and fundamental analysis, 
                ABCG Research delivers comprehensive research that drives informed investment decisions.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('https://research.albaricg.com/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit ABCG Research
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Collaboration Section */}
        <Card className="gradient-card border-primary/20 shadow-glow-primary">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Our Collaboration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              This product represents a powerful joint effort combining OptiQuant IA's cutting-edge expertise 
              in quantitative finance and AI development with ABCG Research's institutional-grade macroeconomic 
              research and market insights.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Together, we deliver a comprehensive platform that provides institutional-grade macro analysis, 
              enriched with AI-driven insights and real-time data. Our mission is to democratize access to 
              sophisticated financial analysis tools that were previously available only to large institutions.
            </p>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-foreground mb-2">Our Mission</h3>
              <p className="text-muted-foreground">
                Delivering institutional-grade macro analysis, enriched with AI-driven insights and real-time data, 
                empowering traders and investors with the tools they need to make informed decisions in today's 
                complex financial markets.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src="/lovable-uploads/Only_text_white_BG_FINAL.png" alt="alphaLens.ai" className="h-[1.95rem]" />
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
    </div>
  );
}