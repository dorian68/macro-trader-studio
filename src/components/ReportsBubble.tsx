import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ApplyToPortfolioButton from "./ApplyToPortfolioButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safePostRequest } from "@/lib/safe-request";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssetSearchBar } from "@/components/AssetSearchBar";
import { 
  FileText, 
  X, 
  Minimize2,
  Plus,
  GripVertical,
  Download,
  Mail,
  FileIcon,
  Settings,
  Loader2,
  Eye,
  Edit3,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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

interface ReportsBubbleProps {
  instrument: string;
  timeframe?: string;
  onClose: () => void;
}

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
  sections: ReportSection[];
  customNotes: string;
  exportFormat: string;
  createdAt: Date;
  status: "draft" | "generated" | "exported";
}

export function ReportsBubble({ instrument, timeframe, onClose }: ReportsBubbleProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [step, setStep] = useState<"compose" | "preview" | "generated">("compose");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetProfile | null>(null);
  const { toast } = useToast();

  // Report composition state
  const [reportConfig, setReportConfig] = useState({
    title: `${instrument} Report - ${new Date().toLocaleDateString()}`,
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
    { id: "overview", title: "Market Overview", description: "General analysis and context", included: true, order: 1 },
    { id: "technical", title: "Technical Analysis", description: "Indicators and key levels", included: true, order: 2 },
    { id: "macro", title: "Macro Commentary", description: "Fundamental factors", included: true, order: 3 },
    { id: "trades", title: "Trading Ideas", description: "Setups and recommendations", included: false, order: 4 },
    { id: "calendar", title: "Economic Calendar", description: "Upcoming events", included: false, order: 5 },
    { id: "risk", title: "Risk Management", description: "Risk management recommendations", included: false, order: 6 }
  ]);

  const exportFormats = [
    { value: "pdf", label: "PDF", icon: FileIcon },
    { value: "html", label: "HTML", icon: FileText },
    { value: "email", label: "Email", icon: Mail }
  ];

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
      const sections = [...prev];
      const index = sections.findIndex(s => s.id === sectionId);
      if (index > 0) {
        const temp = sections[index].order;
        sections[index].order = sections[index - 1].order;
        sections[index - 1].order = temp;
        return sections.sort((a, b) => a.order - b.order);
      }
      return sections;
    });
  };

  const moveSectionDown = (sectionId: string) => {
    setAvailableSections(prev => {
      const sections = [...prev];
      const index = sections.findIndex(s => s.id === sectionId);
      if (index < sections.length - 1) {
        const temp = sections[index].order;
        sections[index].order = sections[index + 1].order;
        sections[index + 1].order = temp;
        return sections.sort((a, b) => a.order - b.order);
      }
      return sections;
    });
  };

  const generateReport = async () => {
    // Validation des champs requis
    const errors: string[] = [];
    
    if (!reportConfig.title.trim()) {
      errors.push("Report title is required");
    }
    
    if (!reportConfig.email.trim()) {
      errors.push("Email address is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reportConfig.email)) {
      errors.push("Valid email address is required");
    }
    
    if (!selectedAsset && !instrument) {
      errors.push("Asset selection is required");
    }
    
    const includedSections = availableSections.filter(s => s.included);
    if (includedSections.length === 0) {
      errors.push("At least one section must be selected");
    }
    
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(". "),
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const sectionsText = includedSections.map(s => s.title).join(", ");
      const currentJobId = Date.now().toString();
      
      // Register dual response handler
      dualResponseHandler.registerHandler(currentJobId, (data, source) => {
        console.log(`[ReportsBubble] Response received from ${source}:`, data);
        
        const report: GeneratedReport = {
          id: currentJobId,
          title: reportConfig.title,
          sections: includedSections,
          customNotes: reportConfig.customNotes,
          exportFormat: reportConfig.exportFormat,
          createdAt: new Date(),
          status: "generated"
        };
        
        setCurrentReport(report);
        setStep("generated");
        
        toast({
          title: "Report Generated",
          description: "Your report is ready for export"
        });
      });
      
      // Call n8n webhook
      const response = await safePostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', {
        type: "reports",
        question: `Generate report "${reportConfig.title}" with sections: ${sectionsText}. ${reportConfig.customNotes}`,
        reportName: `${reportConfig.title}` ,
        instrument: selectedAsset?.symbol || instrument,
        timeframe: timeframe || "1H",
        exportFormat: reportConfig.exportFormat,
        email: reportConfig.email,
        sections: includedSections.map(section => ({
          id: section.id,
          title: section.title,
          description: section.description,
          order: section.order
        })),
        customNotes: reportConfig.customNotes,
        job_id: currentJobId
      });

      // Handle HTTP response
      try {
        if (response.ok) {
          const rawData = await response.json();
          dualResponseHandler.handleHttpResponse(currentJobId, rawData);
        } else {
          console.log(`[ReportsBubble] HTTP error ${response.status}, waiting for Supabase response`);
        }
      } catch (httpError) {
        console.log(`[ReportsBubble] HTTP response failed, waiting for Supabase response:`, httpError);
      }
    } catch (error) {
      console.error('Webhook error:', error);
      
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
    if (!currentReport) return;
    
    toast({
      title: "Export in Progress",
      description: `Generating ${currentReport.exportFormat.toUpperCase()} file`
    });
    
    // Simulate export
    setTimeout(() => {
      toast({
        title: "Report Exported",
        description: "File has been downloaded successfully"
      });
    }, 2000);
  };

  const resetComposer = () => {
    setStep("compose");
    setCurrentReport(null);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full shadow-lg bg-green-500 hover:bg-green-600"
        >
          <FileText className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed z-50 mobile-fade-in",
      // Mobile: Full width with safe margins and scroll
      "inset-x-3 top-4 bottom-4 sm:inset-x-4",
      // Desktop: Right side positioning with controlled width
      "sm:right-6 sm:left-auto sm:top-6 sm:bottom-6",
      "sm:w-[450px] sm:max-w-[calc(100vw-3rem)]",
      // Ensure proper overflow handling
      "max-h-[calc(100vh-2rem)] overflow-hidden"
    )}>
      <Card className="shadow-2xl border-green-500/20 bg-background/95 backdrop-blur-lg h-full flex flex-col">
        {/* Header - Fixed at top */}
        <CardHeader className="pb-4 flex-shrink-0 border-b border-border/10 px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
              <CardTitle className="text-base sm:text-lg truncate">Report Generator</CardTitle>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 touch-friendly"
                title="Minimize"
              >
                <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 touch-friendly"
                title="Close"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {selectedAsset?.symbol || instrument}
            </Badge>
            <Badge variant="secondary" className="text-xs border-green-500/20">
              {step === "compose" ? "Composition" : step === "preview" ? "Preview" : "Generated"}
            </Badge>
          </div>
        </CardHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <CardContent className="space-y-4 px-6 py-4">
            {step === "compose" && (
            <>
              {/* Report Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  value={reportConfig.title}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Your report name"
                />
              </div>

              {/* Target Asset */}
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

              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={reportConfig.email}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address..."
                />
              </div>

              {/* Export Format */}
              <div className="space-y-2">
                <Label>Export Format</Label>
                <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
                  {exportFormats.map((format) => {
                    const IconComponent = format.icon;
                    return (
                      <Button
                        key={format.value}
                        variant={reportConfig.exportFormat === format.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReportConfig(prev => ({ ...prev, exportFormat: format.value }))}
                        className="flex items-center gap-2 text-xs touch-friendly"
                      >
                        <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
                        {format.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Sections Selection */}
              <div className="space-y-2">
                <Label>Sections to Include</Label>
                <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-2">
                  {availableSections.map((section) => (
                    <div key={section.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-accent/50 touch-friendly">
                      <Checkbox
                        id={section.id}
                        checked={section.included}
                        onCheckedChange={() => toggleSection(section.id)}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={section.id} className="text-sm font-medium cursor-pointer block truncate">
                          {section.title}
                        </label>
                        <p className="text-xs text-muted-foreground line-clamp-2">{section.description}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSectionUp(section.id)}
                          className="h-6 w-6 p-0 text-xs touch-friendly"
                          title="Move up"
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSectionDown(section.id)}
                          className="h-6 w-6 p-0 text-xs touch-friendly"
                          title="Move down"
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Custom Notes</Label>
                <Textarea
                  id="notes"
                  value={reportConfig.customNotes}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, customNotes: e.target.value }))}
                  placeholder="Add your custom comments..."
                  className="h-16 sm:h-20 text-sm"
                />
              </div>

              {/* Generate Button */}
              <Button 
                onClick={generateReport} 
                disabled={isGenerating || availableSections.filter(s => s.included).length === 0}
                className="w-full touch-friendly"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </>
          )}

          {step === "generated" && currentReport && (
            <div className="space-y-4">
              {/* Report Preview */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">{currentReport.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                  Generated on {currentReport.createdAt.toLocaleString()}
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-xs sm:text-sm font-medium">Included sections:</h4>
                  <ul className="text-xs sm:text-sm space-y-1">
                    {currentReport.sections.map((section, index) => (
                      <li key={section.id} className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-green-500 text-white text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="truncate">{section.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {currentReport.customNotes && (
                  <div className="mt-3 pt-3 border-t">
                    <h4 className="text-xs sm:text-sm font-medium mb-1">Custom Notes:</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{currentReport.customNotes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                <Button variant="outline" onClick={resetComposer} className="touch-friendly">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button onClick={exportReport} className="touch-friendly">
                  <Download className="h-4 w-4 mr-2" />
                  Export {currentReport.exportFormat.toUpperCase()}
                </Button>
              </div>
              <div className="flex justify-end mt-3">
                <ApplyToPortfolioButton 
                  analysisContent={currentReport.title}
                  analysisType="report"
                  className="text-xs"
                />
              </div>
            </div>
          )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
}