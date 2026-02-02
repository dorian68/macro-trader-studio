import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { DemoWelcome } from "@/components/DemoWelcome";
import { MacroCommentary } from "@/components/MacroCommentary";
import { Reports } from "@/components/Reports";
import { TrendingUp, ArrowRight, Sparkles, Brain, BarChart3, Shield } from "lucide-react";

const ProductPresentation = () => {
  const [activeModule, setActiveModule] = useState("welcome");

  const renderActiveModule = () => {
    switch (activeModule) {
      case "welcome":
        return <DemoWelcome onModuleSelect={setActiveModule} />;
      case "commentary":
        return <MacroCommentary />;
      case "reports":
        return <Reports />;
      default:
        return <DemoWelcome onModuleSelect={setActiveModule} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Header - Mobile Optimized */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="gradient-primary p-2 rounded-xl shadow-glow-primary shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">AlphaLens</h1>
              </div>
            </div>
            <Link to="/" className="shrink-0">
              <Button className="gradient-primary shadow-glow-primary text-sm sm:text-base px-3 sm:px-4 py-2 touch-friendly">
                <span className="hidden xs:inline">Get Started</span>
                <span className="xs:hidden">Start</span>
                <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile Optimized */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 mobile-fade-in">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 text-sm">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Revolutionize your trading with AI
          </Badge>

          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight mobile-title">
              Trading Intelligence
              <span className="gradient-primary bg-clip-text text-transparent block sm:inline"> Powered by AI</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mobile-body px-2">
              Transform your trading approach with our advanced AI assistant.
              Real-time analysis, precise predictions and optimized risk management.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link to="/" className="w-full sm:w-auto">
              <Button size="lg" className="gradient-primary shadow-glow-primary text-base sm:text-lg px-6 sm:px-8 py-3 w-full sm:w-auto touch-friendly">
                Get Started Now
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-3 w-full sm:w-auto touch-friendly">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features - Mobile Optimized */}
      <section className="py-12 sm:py-16 lg:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4 mobile-title">
              Advanced Features
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mobile-body px-2">
              Discover the tools that revolutionize modern trading
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="gradient-card border-border/50 hover:shadow-glow-primary transition-smooth mobile-fade-in touch-friendly">
              <CardHeader className="pb-4">
                <div className="gradient-primary p-3 rounded-xl w-fit shadow-glow-primary mb-3">
                  <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-foreground text-lg sm:text-xl">Advanced AI Analysis</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm sm:text-base mobile-body leading-relaxed">
                  Machine learning algorithms to analyze markets
                  and identify the best trading opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-card border-border/50 hover:shadow-glow-success transition-smooth mobile-fade-in touch-friendly">
              <CardHeader className="pb-4">
                <div className="gradient-success p-3 rounded-xl w-fit shadow-glow-success mb-3">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-success-foreground" />
                </div>
                <CardTitle className="text-foreground text-lg sm:text-xl">Real-Time Data</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm sm:text-base mobile-body leading-relaxed">
                  Live data feed for all major markets.
                  Instant prices, volumes and technical indicators.
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-card border-border/50 hover:shadow-medium transition-smooth mobile-fade-in touch-friendly sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-4">
                <div className="bg-warning/20 border border-warning/30 p-3 rounded-xl w-fit mb-3">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                </div>
                <CardTitle className="text-foreground text-lg sm:text-xl">Risk Management</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm sm:text-base mobile-body leading-relaxed">
                  Advanced risk management tools with automatic calculation
                  of stop-loss and take-profit levels.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Section - Mobile Optimized */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-card/20">
        <div className="max-w-6xl mx-auto">
          <Layout activeModule={activeModule} onModuleChange={setActiveModule}>
            {renderActiveModule()}
          </Layout>
        </div>
      </section>

      {/* CTA Section - Mobile Optimized */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 safe-bottom">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="gradient-card border-primary/20 shadow-glow-primary mobile-fade-in">
            <CardContent className="p-6 sm:p-8 lg:p-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6 mobile-title">
                Ready to revolutionize your trading?
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto mobile-body leading-relaxed px-2">
                Join thousands of traders who already use our AI platform
                to optimize their performance.
              </p>
              <Link to="/" className="block sm:inline-block">
                <Button size="lg" className="gradient-primary shadow-glow-primary text-base sm:text-lg px-8 sm:px-12 py-3 sm:py-4 w-full sm:w-auto touch-friendly">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default ProductPresentation;
