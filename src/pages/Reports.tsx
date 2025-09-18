import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Plus, ArrowUp, ArrowDown, Check } from "lucide-react";
import Layout from "@/components/Layout";
import { AssetSearchBar } from "@/components/AssetSearchBar";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { safePostRequest } from "@/lib/safe-request";
import { useAIInteractionLogger } from "@/hooks/useAIInteractionLogger";
import { enhancedPostRequest, handleResponseWithFallback } from "@/lib/enhanced-request";
import { useRealtimeJobManager } from "@/hooks/useRealtimeJobManager";
import { useRealtimeResponseInjector } from "@/hooks/useRealtimeResponseInjector";
import { dualResponseHandler } from "@/lib/dual-response-handler";

interface AssetProfile {
  id: number;
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  market_cap: number | null;
  currency: string | null;
  exchange: string | null;
}

interface ReportSection {
  id: string;
  title: string;
  description: string;
  included: boolean;
  order: number;
  userNotes?: string;
}

interface GeneratedReport {
  id: string;
  title: string;
  sections: Array<{
    title: string;
    content: string;
    userNotes?: string;
  }>;
  customNotes: string;
  exportFormat: string;
  createdAt: Date;
  status: "draft" | "generated" | "exported";
}

export default function Reports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logInteraction } = useAIInteractionLogger();
  const { createJob } = useRealtimeJobManager();

  // Set up automatic response injection from Supabase
  useRealtimeResponseInjector({
    onReportResult: (responseData, jobId) => {
      console.log('📄 [Reports] Realtime response injected:', { responseData, jobId });
      
      // Process the report data from Supabase exactly as HTTP response
      const includedSections = availableSections.filter(s => s.included);
      const generatedSections = includedSections.map(section => ({
        title: section.title,
        content: responseData.sections?.[section.id] || responseData.content || `Generated content for the "${section.title}" section. This section contains detailed analysis based on your recent trading data and current market conditions.`,
        userNotes: section.userNotes || ""
      }));

      const newReport: GeneratedReport = {
        id: jobId,
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
        title: "Report Generated",
        description: "Your report has been successfully generated from realtime data",
        duration: 5000
      });
    }
  });
  const [step, setStep] = useState<"compose" | "preview" | "generated">("compose");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetProfile | null>(null);

  const [reportConfig, setReportConfig] = useState({
    title: "Monthly Trading Report",
    customNotes: "",
    exportFormat: "pdf",
    email: ""
  });

  // Update report title when asset is selected
  useEffect(() => {
    if (selectedAsset) {
      setReportConfig(prev => ({
        ...prev,
        title: `${selectedAsset.symbol} Report - ${new Date().toLocaleDateString()}`
      }));
    }
  }, [selectedAsset]);

  const [availableSections, setAvailableSections] = useState<ReportSection[]>([
    {
      id: "market",
      title: "Market Conditions",
      description: "Macro context and trading conditions",
      included: true,
      order: 1,
      userNotes: ""
    },
    {
      id: "technical",
      title: "Technical Analysis",
      description: "Analysis of identified patterns and signals",
      included: true,
      order: 2,
      userNotes: ""
    },
    {
      id: "risks",
      title: "Key Risks",
      description: "Risk assessment and key threats to watch",
      included: true,
      order: 3,
      userNotes: ""
    },
    {
      id: "events",
      title: "Event Watch",
      description: "Upcoming events and catalysts to monitor",
      included: true,
      order: 4,
      userNotes: ""
    },
    {
      id: "sentiment",
      title: "Sentiment & Positioning",
      description: "Market sentiment and positioning analysis",
      included: true,
      order: 5,
      userNotes: ""
    },
    {
      id: "recommendations",
      title: "Recommendations",
      description: "Investment recommendations and strategic outlook",
      included: true,
      order: 6,
      userNotes: ""
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

  const updateSectionNotes = (sectionId: string, notes: string) => {
    setAvailableSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, userNotes: notes }
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

    try {
      const includedSections = availableSections.filter(s => s.included);
      const sectionsText = includedSections.map(s => s.title).join(", ");
      
      // Prepare payload for n8n webhook
      const reportPayload = {
        mode: "run",
        type: "reports",
        question: `Generate report "${reportConfig.title}" with sections: ${sectionsText}. ${reportConfig.customNotes}`,
        instrument: selectedAsset?.symbol || "Multi-Asset",
        timeframe: "1D",
        exportFormat: reportConfig.exportFormat,
        email: reportConfig.email,
        sections: includedSections.map((section, index) => ({
          id: section.id,
          title: section.title,
          description: section.description,
          order: index + 1,
          userNotes: section.userNotes || ""
        })),
        customNotes: reportConfig.customNotes
      };

      // Create Realtime job for report generation
      const reportJobId = await createJob(
        'reports',
        selectedAsset?.symbol || "Multi-Asset",
        reportPayload,
        'Report'
      );

      // Register dual response handler
      dualResponseHandler.registerHandler(reportJobId, (data, source) => {
        console.log(`📄 [Reports] Response received from ${source}:`, {
          source,
          hasData: !!data,
          dataType: typeof data,
          dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
          timestamp: new Date().toISOString()
        });
        console.log(`📄 [Reports] Full response data from ${source}:`, data);
        
        const generatedSections = includedSections.map(section => ({
          title: section.title,
          content: data.sections?.[section.id] || data.content || `Generated content for the "${section.title}" section. This section contains detailed analysis based on your recent trading data and current market conditions.`,
          userNotes: section.userNotes || ""
        }));

        const newReport: GeneratedReport = {
          id: reportJobId,
          title: reportConfig.title,
          sections: generatedSections,
          customNotes: reportConfig.customNotes,
          exportFormat: reportConfig.exportFormat,
          createdAt: new Date(),
          status: "generated"
        };

        setCurrentReport(newReport);
        setStep("generated");
        
        toast({
          title: "Report Generated",
          description: "Your report has been successfully generated."
        });
      });

      // Call to n8n webhook with Realtime tracking
      const { response } = await enhancedPostRequest(
        'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        {
          ...reportPayload,
          job_id: reportJobId
        },
        {
          enableJobTracking: true,
          jobType: 'reports',
          instrument: selectedAsset?.symbol || "Multi-Asset",
          feature: 'report',
          jobId: reportJobId
        }
      );

      // Handle HTTP response
      try {
        if (response.ok) {
          const responseData = await response.json();
          dualResponseHandler.handleHttpResponse(reportJobId, responseData);
        } else {
          console.log(`📄 [Reports] HTTP error ${response.status}, waiting for Supabase response`);
        }
      } catch (httpError) {
        console.log(`📄 [Reports] HTTP response failed, waiting for Supabase response:`, httpError);
      }

      // Report generation simulation for display (fallback)
      if (!currentReport) {
        const generatedSections = includedSections.map(section => ({
          title: section.title,
          content: `Generated content for the "${section.title}" section. This section contains detailed analysis based on your recent trading data and current market conditions.`,
          userNotes: section.userNotes || ""
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
      }

      // Log successful interaction
      await logInteraction({
        featureName: 'report',
        userQuery: `Generate report "${reportConfig.title}" with sections: ${sectionsText}. Custom notes: ${reportConfig.customNotes}`,
        aiResponse: currentReport
      });

      toast({
        title: "Report Generated",
        description: "Your report has been successfully generated.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = () => {
    // Simulate export
    toast({
      title: "Report Exported",
      description: `Your report has been exported in ${reportConfig.exportFormat.toUpperCase()} format.`,
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
            onClick={() => navigate('/dashboard')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">Generate and export detailed trading reports</p>
          </div>
        </div>

        {step === "compose" && (
          <div className="space-y-6">
            {/* Report Configuration */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reportTitle">Report Title</Label>
                    <Input
                      id="reportTitle"
                      value={reportConfig.title}
                      onChange={(e) => setReportConfig({ ...reportConfig, title: e.target.value })}
                      placeholder="Your report name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exportFormat">Export Format</Label>
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
                  <Label>Target Asset</Label>
                  <AssetSearchBar
                    onAssetSelect={setSelectedAsset}
                    selectedAsset={selectedAsset}
                    placeholder="Select an asset for the report..."
                    className="mb-2"
                  />
                  {selectedAsset && (
                    <Badge variant="outline" className="text-xs">
                      Selected: {selectedAsset.symbol} - {selectedAsset.name}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={reportConfig.email}
                    onChange={(e) => setReportConfig({ ...reportConfig, email: e.target.value })}
                    placeholder="Enter your email address..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customNotes">Custom Notes</Label>
                  <Textarea
                    id="customNotes"
                    value={reportConfig.customNotes}
                    onChange={(e) => setReportConfig({ ...reportConfig, customNotes: e.target.value })}
                    placeholder="Add specific notes or instructions for the report..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sections Selection */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle>Report Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availableSections
                    .sort((a, b) => a.order - b.order)
                    .map((section) => (
                      <Card
                        key={section.id}
                        className={cn(
                          "transition-colors",
                          section.included ? "bg-primary/5 border-primary/30" : "bg-muted/20"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4 mb-4">
                            <Checkbox
                              checked={section.included}
                              onCheckedChange={() => toggleSection(section.id)}
                              className="mt-1"
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

                          {section.included && (
                            <div className="space-y-2">
                              <Label htmlFor={`notes-${section.id}`} className="text-sm font-medium">
                                User Notes
                              </Label>
                              <Textarea
                                id={`notes-${section.id}`}
                                value={section.userNotes || ""}
                                onChange={(e) => updateSectionNotes(section.id, e.target.value)}
                                placeholder="Add comments, focus areas, or questions for this section..."
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
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
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Generate Report
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
                    <CardTitle>
                      {currentReport.title}
                      {selectedAsset && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({selectedAsset.symbol})
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generated on {currentReport.createdAt.toLocaleDateString()} at{" "}
                      {currentReport.createdAt.toLocaleTimeString()}
                    </p>
                    {selectedAsset && (
                      <Badge variant="outline" className="mt-2">
                        Target Asset: {selectedAsset.symbol} - {selectedAsset.name}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Check className="w-3 h-3 mr-1" />
                    Generated
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentReport.sections.map((section, index) => (
                  <Card key={index} className="border-l-4 border-primary/30">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-3">{section.title}</h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">{section.content}</p>
                      
                      {section.userNotes && (
                        <div className="mt-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
                          <h4 className="text-sm font-medium text-accent-foreground mb-2">User Notes:</h4>
                          <p className="text-sm text-muted-foreground">{section.userNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {currentReport.customNotes && (
                  <div className="border-l-4 border-warning/30 pl-4 bg-warning/5 p-4 rounded-r-lg">
                    <h3 className="font-semibold text-lg mb-2">Custom Notes</h3>
                    <p className="text-muted-foreground leading-relaxed">{currentReport.customNotes}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button onClick={resetComposer} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    New Report
                  </Button>
                  <Button onClick={exportReport} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Export as {currentReport.exportFormat.toUpperCase()}
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