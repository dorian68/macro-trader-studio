import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Plus, ArrowUp, ArrowDown, Check } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ReportSection {
  id: string;
  title: string;
  description: string;
  included: boolean;
  order: number;
}

interface GeneratedReport {
  id: string;
  title: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  customNotes: string;
  exportFormat: string;
  createdAt: Date;
  status: "draft" | "generated" | "exported";
}

export default function Reports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"compose" | "preview" | "generated">("compose");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);

  const [reportConfig, setReportConfig] = useState({
    title: "Rapport de Trading Mensuel",
    customNotes: "",
    exportFormat: "pdf"
  });

  const [availableSections, setAvailableSections] = useState<ReportSection[]>([
    {
      id: "performance",
      title: "Performance Globale",
      description: "Résumé des performances avec métriques clés",
      included: true,
      order: 1
    },
    {
      id: "trades",
      title: "Historique des Trades",
      description: "Liste détaillée de tous les trades exécutés",
      included: true,
      order: 2
    },
    {
      id: "analysis",
      title: "Analyse Technique",
      description: "Analyse des patterns et signaux identifiés",
      included: false,
      order: 3
    },
    {
      id: "risk",
      title: "Gestion des Risques",
      description: "Évaluation du risque et exposition du portefeuille",
      included: true,
      order: 4
    },
    {
      id: "market",
      title: "Conditions de Marché",
      description: "Contexte macro et conditions de trading",
      included: false,
      order: 5
    },
    {
      id: "recommendations",
      title: "Recommandations",
      description: "Suggestions d'amélioration et stratégies futures",
      included: true,
      order: 6
    }
  ]);

  const toggleSection = (sectionId: string) => {
    setAvailableSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, included: !section.included }
          : section
      )
    );
  };

  const moveSectionUp = (sectionId: string) => {
    setAvailableSections(prev => {
      const section = prev.find(s => s.id === sectionId);
      if (!section || section.order === 1) return prev;

      return prev.map(s => {
        if (s.id === sectionId) return { ...s, order: s.order - 1 };
        if (s.order === section.order - 1) return { ...s, order: s.order + 1 };
        return s;
      });
    });
  };

  const moveSectionDown = (sectionId: string) => {
    setAvailableSections(prev => {
      const maxOrder = Math.max(...prev.map(s => s.order));
      const section = prev.find(s => s.id === sectionId);
      if (!section || section.order === maxOrder) return prev;

      return prev.map(s => {
        if (s.id === sectionId) return { ...s, order: s.order + 1 };
        if (s.order === section.order + 1) return { ...s, order: s.order - 1 };
        return s;
      });
    });
  };

  const generateReport = async () => {
    setIsGenerating(true);

    // Simulate report generation
    setTimeout(() => {
      const includedSections = availableSections
        .filter(section => section.included)
        .sort((a, b) => a.order - b.order);

      const generatedSections = includedSections.map(section => ({
        title: section.title,
        content: `Contenu généré pour la section "${section.title}". Cette section contient une analyse détaillée basée sur vos données de trading récentes et les conditions de marché actuelles.`
      }));

      const newReport: GeneratedReport = {
        id: Date.now().toString(),
        title: reportConfig.title,
        sections: generatedSections,
        customNotes: reportConfig.customNotes,
        exportFormat: reportConfig.exportFormat,
        createdAt: new Date(),
        status: "generated"
      };

      setCurrentReport(newReport);
      setStep("generated");
      setIsGenerating(false);

      toast({
        title: "Rapport généré",
        description: "Votre rapport a été généré avec succès.",
      });
    }, 3000);
  };

  const exportReport = () => {
    // Simulate export
    toast({
      title: "Rapport exporté",
      description: `Votre rapport a été exporté en format ${reportConfig.exportFormat.toUpperCase()}.`,
    });
  };

  const resetComposer = () => {
    setStep("compose");
    setCurrentReport(null);
  };

  return (
    <Layout activeModule="reports" onModuleChange={() => {}}>
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
            <h1 className="text-3xl font-bold text-foreground">Rapports</h1>
            <p className="text-muted-foreground">Génération et export de rapports de trading détaillés</p>
          </div>
        </div>

        {step === "compose" && (
          <div className="space-y-6">
            {/* Report Configuration */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle>Configuration du Rapport</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reportTitle">Titre du rapport</Label>
                    <Input
                      id="reportTitle"
                      value={reportConfig.title}
                      onChange={(e) => setReportConfig({ ...reportConfig, title: e.target.value })}
                      placeholder="Nom de votre rapport"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exportFormat">Format d'export</Label>
                    <Select 
                      value={reportConfig.exportFormat} 
                      onValueChange={(value) => setReportConfig({ ...reportConfig, exportFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="docx">Word (DOCX)</SelectItem>
                        <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customNotes">Notes personnalisées</Label>
                  <Textarea
                    id="customNotes"
                    value={reportConfig.customNotes}
                    onChange={(e) => setReportConfig({ ...reportConfig, customNotes: e.target.value })}
                    placeholder="Ajoutez des notes ou instructions spécifiques pour le rapport..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sections Selection */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle>Sections du Rapport</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {availableSections
                    .sort((a, b) => a.order - b.order)
                    .map((section) => (
                      <div
                        key={section.id}
                        className={cn(
                          "flex items-center gap-4 p-4 border border-border/50 rounded-lg transition-colors",
                          section.included ? "bg-primary/5 border-primary/30" : "bg-muted/20"
                        )}
                      >
                        <Checkbox
                          checked={section.included}
                          onCheckedChange={() => toggleSection(section.id)}
                        />
                        
                        <div className="flex-1">
                          <h4 className="font-medium">{section.title}</h4>
                          <p className="text-sm text-muted-foreground">{section.description}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSectionUp(section.id)}
                            disabled={section.order === 1}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSectionDown(section.id)}
                            disabled={section.order === Math.max(...availableSections.map(s => s.order))}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>

                        <Badge variant="outline">
                          {section.order}
                        </Badge>
                      </div>
                    ))}
                </div>

                <Button 
                  onClick={generateReport}
                  disabled={isGenerating || !availableSections.some(s => s.included)}
                  className="w-full mt-6"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <FileText className="mr-2 h-4 w-4 animate-pulse" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Générer le Rapport
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "generated" && currentReport && (
          <div className="space-y-6">
            {/* Report Preview */}
            <Card className="gradient-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{currentReport.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Généré le {currentReport.createdAt.toLocaleDateString()} à{" "}
                      {currentReport.createdAt.toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Check className="w-3 h-3 mr-1" />
                    Généré
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentReport.sections.map((section, index) => (
                  <div key={index} className="border-l-4 border-primary/30 pl-4">
                    <h3 className="font-semibold text-lg mb-2">{section.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                  </div>
                ))}

                {currentReport.customNotes && (
                  <div className="border-l-4 border-warning/30 pl-4 bg-warning/5 p-4 rounded-r-lg">
                    <h3 className="font-semibold text-lg mb-2">Notes Personnalisées</h3>
                    <p className="text-muted-foreground leading-relaxed">{currentReport.customNotes}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button onClick={resetComposer} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Rapport
                  </Button>
                  <Button onClick={exportReport} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Exporter en {currentReport.exportFormat.toUpperCase()}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}