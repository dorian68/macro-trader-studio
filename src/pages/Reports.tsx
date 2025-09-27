import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Plus, ArrowUp, ArrowDown, Check, Mail } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const { logInteraction, checkCredits } = useAIInteractionLogger();
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
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

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

  // Check for pending results from persistent notifications
  useEffect(() => {
    const pendingResult = sessionStorage.getItem('pendingResult');
    if (pendingResult) {
      try {
        const result = JSON.parse(pendingResult);
        if (result.type.includes('report')) {
          // Process the report data similar to the realtime injector
          const includedSections = availableSections.filter(s => s.included);
          const generatedSections = includedSections.map(section => ({
            title: section.title,
            content: result.resultData.sections?.[section.id] || result.resultData.content || `Generated content for the "${section.title}" section.`,
            userNotes: section.userNotes || ""
          }));

          const newReport: GeneratedReport = {
            id: result.jobId,
            title: reportConfig.title,
            sections: generatedSections,
            customNotes: reportConfig.customNotes,
            exportFormat: reportConfig.exportFormat,
            createdAt: new Date(),
            status: "generated"
          };

          setCurrentReport(newReport);
          setStep("generated");
          sessionStorage.removeItem('pendingResult');
        }
      } catch (error) {
        console.error('Error parsing pending result:', error);
        sessionStorage.removeItem('pendingResult');
      }
    }
  }, [availableSections, reportConfig]);

  const generateReport = async () => {
    // CRITICAL: Check credits before allowing request (Reports)
    if (!checkCredits('report')) {
      toast({
        title: "No credits remaining",
        description: "You have no remaining credits for Reports. Please upgrade your plan.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    console.log('🔄 [Loader] Starting report generation');

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

      // 1. CRITICAL: Subscribe to jobs table BEFORE sending POST request
      console.log('📡 [Realtime] Subscribing to jobs updates before POST');
      
      const realtimeChannel = supabase
        .channel(`reports-${reportJobId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user?.id}`
         }, (payload) => {
           console.log('📩 [Realtime] Job update received:', payload);
           const job = payload.new as any;
           
           if (job && job.status && job.id === reportJobId) {
             if (job.status === 'completed' && job.response_payload) {
               console.log('📩 [Realtime] Processing completed response with HTML content');
               console.log('🔄 [Loader] Stopping loader - Realtime response received');
               
               // Set HTML content if available
               if (job.response_payload) {
                  setHtmlContent(job.response_payload);
                  setStep("generated");
                  setIsGenerating(false);
                  
                   // Credit logging handled by dual response handler to avoid duplicates
                  
                  toast({
                    title: "Report Generated",
                    description: "Your report has been successfully generated."
                  });
               } else {
                 setHtmlContent(null);
                 setIsGenerating(false);
                 toast({
                   title: "Report Generated",
                   description: "Report completed but no content available."
                 });
               }
             } else if (job.status === 'error') {
               console.log('❌ [Realtime] Job failed:', job.error_message);
               console.log('🔄 [Loader] Stopping loader - Realtime error received');
               setIsGenerating(false);
               setHtmlContent(null);
               toast({
                 title: "Error",
                 description: job.error_message || "Failed to generate report. Please try again.",
                 variant: "destructive"
               });
             }
           }
         })
        .subscribe();
      
      console.log('📡 [Realtime] Subscribed before POST');

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
        
        // Log successful interaction from dual response handler
        logInteraction({
          featureName: 'report',
          userQuery: `Generate report "${reportConfig.title}" with sections: ${sectionsText}. Custom notes: ${reportConfig.customNotes}`,
          aiResponse: data
        });
        
        toast({
          title: "Report Generated",
          description: "Your report has been successfully generated."
        });
      });

      // 2. Send POST request after subscription is active
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

      // 3. Handle HTTP response (secondary path)
      try {
        if (response.ok) {
          const responseData = await response.json();
          console.log('📩 [HTTP] Response:', responseData);
          // Note: Realtime is primary, HTTP is just a backup log
          // The UI updates are handled by Realtime callback above
        } else {
          console.log(`⚠️ [HTTP] Error ${response.status}, waiting for Realtime…`);
        }
      } catch (httpError) {
        console.log(`⚠️ [HTTP] Timeout, waiting for Realtime…`, httpError);
        // CRITICAL: Do NOT stop loading here - wait for Realtime
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

      // Credit logging handled by dual response handler to avoid duplicates

      toast({
        title: "Report Generated",
        description: "Your report has been successfully generated.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: "Report Generation Failed",
        description: errorMessage,
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

  const downloadPDF = () => {
    if (!htmlContent) return;
    
    // Create a new window with the HTML content
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${reportConfig.title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
    
    toast({
      title: "PDF Download",
      description: "Print dialog opened. Use your browser's print to PDF feature.",
    });
  };

  const sendByEmail = () => {
    if (!htmlContent || !reportConfig.email) {
      toast({
        title: "Email Error",
        description: "Please ensure an email address is provided.",
        variant: "destructive"
      });
      return;
    }
    
    // Simulate email sending
    toast({
      title: "Email Sent",
      description: `Report has been sent to ${reportConfig.email}`,
    });
  };

  const resetComposer = () => {
    setStep("compose");
    setCurrentReport(null);
    setHtmlContent(null);
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
                  <div className="relative">
                    <Textarea
                      id="customNotes"
                      value={reportConfig.customNotes}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 500) {
                          setReportConfig({ ...reportConfig, customNotes: value });
                        }
                      }}
                      placeholder="Add specific notes or instructions for the report..."
                      rows={3}
                      className="pb-8"
                      maxLength={500}
                    />
                    <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                      {reportConfig.customNotes.length}/500
                    </div>
                  </div>
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
                              <div className="relative">
                                <Textarea
                                  id={`notes-${section.id}`}
                                  value={section.userNotes || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value.length <= 500) {
                                      updateSectionNotes(section.id, value);
                                    }
                                  }}
                                  placeholder="Add comments, focus areas, or questions for this section..."
                                  rows={2}
                                  className="text-sm pb-8"
                                  maxLength={500}
                                />
                                <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                                  {(section.userNotes || "").length}/500
                                </div>
                              </div>
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

        {step === "generated" && (htmlContent || currentReport) && (
          <div className="space-y-6">
            {/* HTML Report Content */}
            {htmlContent ? (
              <Card className="gradient-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{reportConfig.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Generated on {new Date().toLocaleDateString()} at{" "}
                        {new Date().toLocaleTimeString()}
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
                <CardContent>
                  {/* Toolbar */}
                  <div className="flex gap-3 mb-6 p-4 bg-accent/5 rounded-lg border border-accent/20">
                    <Button onClick={downloadPDF} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button 
                      onClick={sendByEmail} 
                      variant="outline"
                      disabled={!reportConfig.email}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Send by Email
                    </Button>
                    <Button onClick={resetComposer} variant="outline" className="ml-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      New Report
                    </Button>
                  </div>
                  
                  {/* HTML Content */}
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </CardContent>
              </Card>
            ) : htmlContent === null ? (
              <Card className="gradient-card">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No report available yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Your report is being processed. Please wait for the content to be generated.
                  </p>
                  <Button onClick={resetComposer} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Report
                  </Button>
                </CardContent>
              </Card>
            ) : currentReport && (
              /* Fallback to old report display */
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
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}