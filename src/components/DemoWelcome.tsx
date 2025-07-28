import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  FileText,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

interface DemoWelcomeProps {
  onModuleSelect: (module: string) => void;
}

const features = [
  {
    id: "commentary",
    icon: TrendingUp,
    title: "Macro Commentary Generator",
    description: "AI-powered market analysis with GPT and curated insights",
    benefits: ["Real-time market data", "Fundamental analysis", "Directional bias"],
    color: "primary"
  },
  {
    id: "technical",
    icon: BarChart3,
    title: "Technical Analysis Integration",
    description: "Comprehensive technical indicators and trading signals",
    benefits: ["Multiple timeframes", "Key support/resistance", "Momentum indicators"],
    color: "success"
  },
  {
    id: "trade-ideas",
    icon: Target,
    title: "Trade Idea Recommender",
    description: "Generate complete trade setups with risk management",
    benefits: ["Entry/Exit levels", "Risk-reward ratios", "Position sizing"],
    color: "warning"
  },
  {
    id: "reports",
    icon: FileText,
    title: "Professional Reports",
    description: "Export-ready analysis reports for clients",
    benefits: ["Multiple formats", "Customizable sections", "Professional layout"],
    color: "danger"
  }
];

export function DemoWelcome({ onModuleSelect }: DemoWelcomeProps) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="relative gradient-primary p-12 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 gradient-success rounded-xl flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-success-foreground" />
              </div>
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                Demo Platform
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              directionAI Demo
            </h1>
            <p className="text-xl text-primary-foreground/90 mb-8 leading-relaxed">
              Experience the power of AI-driven trading analysis. Test our comprehensive suite 
              of tools designed for professional traders and institutions.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => onModuleSelect("commentary")}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Start Demo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Watch Overview
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Explore Our AI Trading Modules
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Each module demonstrates core capabilities of our AI trading assistant. 
            Click any module to experience it firsthand.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.id}
                className="gradient-card border-border-light shadow-medium hover:shadow-strong transition-smooth cursor-pointer group"
                onClick={() => onModuleSelect(feature.id)}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg transition-smooth group-hover:scale-110 ${
                      feature.color === "primary" ? "bg-primary/10 text-primary" :
                      feature.color === "success" ? "bg-success/10 text-success" :
                      feature.color === "warning" ? "bg-warning/10 text-warning" :
                      "bg-danger/10 text-danger"
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-smooth">
                        {feature.title}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border-light">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full group-hover:bg-accent/50"
                    >
                      Try {feature.title.split(' ')[0]} Module
                      <ArrowRight className="h-3 w-3 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <Card className="gradient-card border-border-light shadow-medium">
        <CardContent className="p-8 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Ready to Experience AI Trading?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            This demo showcases the core capabilities of our AI trading assistant. 
            Start with any module above or begin with our most popular feature.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button 
              size="lg"
              onClick={() => onModuleSelect("commentary")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Start with Macro Analysis
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => onModuleSelect("trade-ideas")}
            >
              <Target className="h-4 w-4 mr-2" />
              Generate Trade Ideas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}