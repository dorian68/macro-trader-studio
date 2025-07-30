import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
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
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="gradient-primary p-2 rounded-xl shadow-glow-primary">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">directionAI</h1>
                <p className="text-xs text-muted-foreground">AI Trading Assistant</p>
              </div>
            </div>
            <Link to="/">
              <Button className="gradient-primary shadow-glow-primary">
                Commencer <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            Révolutionnez votre trading avec l'IA
          </Badge>
          
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
              Trading Intelligence
              <span className="gradient-primary bg-clip-text text-transparent"> Artificielle</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transformez votre approche du trading avec notre assistant IA avancé. 
              Analyses en temps réel, prédictions précises et gestion de risque optimisée.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button size="lg" className="gradient-primary shadow-glow-primary text-lg px-8 py-3">
                Commencer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3">
              Voir la démo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Fonctionnalités avancées
            </h2>
            <p className="text-muted-foreground text-lg">
              Découvrez les outils qui révolutionnent le trading moderne
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="gradient-card border-border/50 hover:shadow-glow-primary transition-smooth">
              <CardHeader>
                <div className="gradient-primary p-3 rounded-xl w-fit shadow-glow-primary">
                  <Brain className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-foreground">Analyse IA Avancée</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Algorithmes d'apprentissage automatique pour analyser les marchés 
                  et identifier les meilleures opportunités de trading.
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-card border-border/50 hover:shadow-glow-success transition-smooth">
              <CardHeader>
                <div className="gradient-success p-3 rounded-xl w-fit shadow-glow-success">
                  <BarChart3 className="h-6 w-6 text-success-foreground" />
                </div>
                <CardTitle className="text-foreground">Données Temps Réel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Flux de données en direct pour tous les marchés majeurs. 
                  Prix, volumes et indicateurs techniques instantanés.
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-card border-border/50 hover:shadow-medium transition-smooth">
              <CardHeader>
                <div className="bg-warning/20 border border-warning/30 p-3 rounded-xl w-fit">
                  <Shield className="h-6 w-6 text-warning" />
                </div>
                <CardTitle className="text-foreground">Gestion de Risque</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Outils avancés de gestion de risque avec calcul automatique 
                  des niveaux de stop-loss et take-profit.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 px-4 bg-card/20">
        <div className="max-w-6xl mx-auto">
          <Layout activeModule={activeModule} onModuleChange={setActiveModule}>
            {renderActiveModule()}
          </Layout>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="gradient-card border-primary/20 shadow-glow-primary">
            <CardContent className="p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Prêt à révolutionner votre trading ?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Rejoignez des milliers de traders qui utilisent déjà notre plateforme IA 
                pour optimiser leurs performances.
              </p>
              <Link to="/">
                <Button size="lg" className="gradient-primary shadow-glow-primary text-lg px-12 py-4">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
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
