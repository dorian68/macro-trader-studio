import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Brain, Globe, TrendingUp, Calendar, Copy, ExternalLink } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AnalysisSection {
  title: string;
  content: string;
  type: "overview" | "technical" | "fundamental" | "sentiment";
  expanded: boolean;
}

interface MacroAnalysis {
  id: string;
  query: string;
  timestamp: Date;
  sections: AnalysisSection[];
  sources: Array<{
    title: string;
    url: string;
    type: "news" | "data" | "research";
  }>;
}

export default function MacroAnalysis() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [analyses, setAnalyses] = useState<MacroAnalysis[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const [queryParams, setQueryParams] = useState({
    query: "",
    assetType: "forex",
    depth: "detailed",
    period: "current"
  });

  const generateAnalysis = async () => {
    if (!queryParams.query.trim()) return;
    
    setIsGenerating(true);
    
    // Simulate AI analysis generation
    setTimeout(() => {
      const newAnalysis: MacroAnalysis = {
        id: Date.now().toString(),
        query: queryParams.query,
        timestamp: new Date(),
        sections: [
          {
            title: "Vue d'ensemble du marché",
            content: `L'analyse macro actuelle révèle des tendances importantes dans le contexte de "${queryParams.query}". Les indicateurs économiques montrent une convergence vers une nouvelle phase de stabilisation avec des opportunités émergentes dans les actifs ${queryParams.assetType}.`,
            type: "overview",
            expanded: true
          },
          {
            title: "Analyse technique",
            content: "Les niveaux de support et résistance indiquent une consolidation en cours. Les moyennes mobiles convergent vers un point de décision critique qui pourrait déterminer la direction à moyen terme.",
            type: "technical",
            expanded: false
          },
          {
            title: "Facteurs fondamentaux",
            content: "Les données macroéconomiques récentes suggèrent un environnement favorable aux investissements défensifs. L'inflation reste contenue tandis que la politique monétaire maintient un ton accommodant.",
            type: "fundamental",
            expanded: false
          },
          {
            title: "Sentiment du marché",
            content: "Le sentiment général des investisseurs montre une prudence optimiste. Les flux de capitaux institutionnels restent positifs malgré une volatilité accrue dans certains segments.",
            type: "sentiment",
            expanded: false
          }
        ],
        sources: [
          { title: "Federal Reserve Economic Data", url: "https://fred.stlouisfed.org", type: "data" },
          { title: "Bank for International Settlements", url: "https://bis.org", type: "research" },
          { title: "Financial Times Markets", url: "https://ft.com", type: "news" }
        ]
      };
      
      setAnalyses(prev => [newAnalysis, ...prev]);
      setQueryParams({ ...queryParams, query: "" });
      setIsGenerating(false);
      
      toast({
        title: "Analyse générée",
        description: "Votre analyse macro a été générée avec succès.",
      });
    }, 3000);
  };

  const toggleSection = (analysisId: string, sectionTitle: string) => {
    const key = `${analysisId}-${sectionTitle}`;
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const copyAnalysis = (analysis: MacroAnalysis) => {
    const text = analysis.sections.map(section => 
      `${section.title}\n${section.content}\n`
    ).join('\n');
    
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: "L'analyse a été copiée dans le presse-papiers.",
    });
  };

  const quickQueries = [
    "Impact de l'inflation sur les devises majeures",
    "Analyse des politiques monétaires BCE vs Fed",
    "Tendances crypto face aux marchés traditionnels",
    "Opportunités dans les matières premières"
  ];

  return (
    <Layout activeModule="macro-analysis" onModuleChange={() => {}}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analyse Macro</h1>
            <p className="text-muted-foreground">Analyses économiques et insights de marchés alimentés par l'IA</p>
          </div>
        </div>

        {/* Query Interface */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Générateur d'Analyses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={queryParams.query}
                onChange={(e) => setQueryParams({ ...queryParams, query: e.target.value })}
                placeholder="Posez votre question macro ou décrivez le contexte à analyser..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type d'actif</label>
                <Select value={queryParams.assetType} onValueChange={(value) => setQueryParams({ ...queryParams, assetType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forex">Devises (Forex)</SelectItem>
                    <SelectItem value="crypto">Cryptomonnaies</SelectItem>
                    <SelectItem value="commodities">Matières premières</SelectItem>
                    <SelectItem value="equities">Actions</SelectItem>
                    <SelectItem value="bonds">Obligations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Profondeur d'analyse</label>
                <Select value={queryParams.depth} onValueChange={(value) => setQueryParams({ ...queryParams, depth: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Rapide</SelectItem>
                    <SelectItem value="detailed">Détaillée</SelectItem>
                    <SelectItem value="comprehensive">Complète</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Période</label>
                <Select value={queryParams.period} onValueChange={(value) => setQueryParams({ ...queryParams, period: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Actuelle</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="quarter">Ce trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setQueryParams({ ...queryParams, query })}
                  className="text-xs"
                >
                  {query}
                </Button>
              ))}
            </div>

            <Button 
              onClick={generateAnalysis} 
              disabled={isGenerating || !queryParams.query.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Brain className="mr-2 h-4 w-4 animate-pulse" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Générer l'Analyse
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analyses Results */}
        <div className="space-y-4">
          {analyses.length === 0 ? (
            <Card className="gradient-card">
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Aucune analyse disponible</h3>
                <p className="text-muted-foreground">Posez une question pour commencer à générer des analyses macro.</p>
              </CardContent>
            </Card>
          ) : (
            analyses.map((analysis) => (
              <Card key={analysis.id} className="gradient-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{analysis.query}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {analysis.timestamp.toLocaleDateString()} à {analysis.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyAnalysis(analysis)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.sections.map((section, sectionIndex) => {
                    const sectionKey = `${analysis.id}-${section.title}`;
                    const isExpanded = expandedSections.has(sectionKey) || section.expanded;
                    
                    return (
                      <div key={sectionIndex} className="border border-border/50 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleSection(analysis.id, section.title)}
                          className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="capitalize">
                              {section.type}
                            </Badge>
                            <h4 className="font-medium">{section.title}</h4>
                          </div>
                          <TrendingUp className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded ? "rotate-90" : ""
                          )} />
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-border/30">
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {section.content}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Sources */}
                  <div className="pt-4 border-t border-border/30">
                    <h5 className="font-medium mb-3 text-sm">Sources</h5>
                    <div className="flex flex-wrap gap-2">
                      {analysis.sources.map((source, sourceIndex) => (
                        <a
                          key={sourceIndex}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}