import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  Eye,
  Calendar,
  Settings,
  Mail,
  RefreshCw,
  Clock,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

const reportTypes = [
  { 
    value: "daily", 
    label: "Daily Brief", 
    description: "Comprehensive daily market overview",
    duration: "~2 minutes"
  },
  { 
    value: "weekly", 
    label: "Weekly Outlook", 
    description: "Strategic weekly market analysis",
    duration: "~5 minutes"
  },
  { 
    value: "onepager", 
    label: "One-Pager Summary", 
    description: "Concise executive summary",
    duration: "~1 minute"
  },
];

const exportFormats = [
  { value: "pdf", label: "PDF Document", icon: "📄" },
  { value: "html", label: "HTML Report", icon: "🌐" },
  { value: "email", label: "Email Summary", icon: "📧" },
];

const includedSections = [
  { id: "macro", label: "Macro Commentary", default: true },
  { id: "technical", label: "Technical Analysis", default: true },
  { id: "trades", label: "Trade Ideas", default: true },
  { id: "calendar", label: "Economic Calendar", default: false },
  { id: "sentiment", label: "Market Sentiment", default: false },
  { id: "news", label: "Key News Summary", default: false },
];

const sampleReports = [
  {
    id: "1",
    name: "Daily Brief - EUR/USD Focus",
    type: "Daily Brief",
    created: "2024-01-15 09:30",
    status: "completed",
    sections: 4
  },
  {
    id: "2", 
    name: "Weekly Outlook - Multi-Asset",
    type: "Weekly Outlook",
    created: "2024-01-14 16:45",
    status: "completed",
    sections: 6
  },
  {
    id: "3",
    name: "Gold Analysis One-Pager",
    type: "One-Pager Summary", 
    created: "2024-01-14 11:20",
    status: "completed",
    sections: 3
  },
];

export function Reports() {
  const [reportType, setReportType] = useState("daily");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [reportTitle, setReportTitle] = useState("");
  const [sections, setSections] = useState(
    includedSections.reduce((acc, section) => ({
      ...acc,
      [section.id]: section.default
    }), {})
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSectionChange = (sectionId: string, checked: boolean) => {
    setSections(prev => ({ ...prev, [sectionId]: checked }));
  };

  const generateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      // In real app, this would trigger download or preview
    }, 3000);
  };

  const getSelectedReportType = () => {
    return reportTypes.find(type => type.value === reportType);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Report Generator</h2>
          <p className="text-muted-foreground mt-1">
            Create professional trading reports and market briefs
          </p>
        </div>
        <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
          <FileText className="h-3 w-3 mr-1" />
          Export Ready
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type Selection */}
          <Card className="gradient-card border-border-light shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Report Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Report Type
                </label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="bg-background/50 border-border-light">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {type.description} • {type.duration}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Report Title
                </label>
                <Input
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder={`${getSelectedReportType()?.label} - ${new Date().toLocaleDateString()}`}
                  className="bg-background/50 border-border-light"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {exportFormats.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setExportFormat(format.value)}
                      className={cn(
                        "p-3 rounded-lg border transition-smooth text-center",
                        exportFormat === format.value
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-card border-border-light hover:bg-accent/50"
                      )}
                    >
                      <div className="text-lg mb-1">{format.icon}</div>
                      <div className="text-xs font-medium">{format.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections Selection */}
          <Card className="gradient-card border-border-light shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Include Sections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {includedSections.map((section) => (
                  <div key={section.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={section.id}
                      checked={sections[section.id] || false}
                      onCheckedChange={(checked) => 
                        handleSectionChange(section.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={section.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {section.label}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button 
            onClick={generateReport}
            disabled={isGenerating}
            size="lg"
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate {getSelectedReportType()?.label}
              </>
            )}
          </Button>
        </div>

        {/* Recent Reports & Preview */}
        <div className="space-y-6">
          {/* Preview */}
          <Card className="gradient-card border-border-light shadow-medium">
            <CardHeader>
              <CardTitle className="text-lg">Report Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-accent/30 rounded-lg p-4 border border-border-light">
                <h4 className="font-medium text-foreground mb-2">
                  {reportTitle || `${getSelectedReportType()?.label} - ${new Date().toLocaleDateString()}`}
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Est. {getSelectedReportType()?.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>
                      {Object.values(sections).filter(Boolean).length} sections included
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card className="gradient-card border-border-light shadow-medium">
            <CardHeader>
              <CardTitle className="text-lg">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sampleReports.map((report) => (
                <div key={report.id} className="p-3 bg-accent/30 rounded-lg border border-border-light">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-sm text-foreground truncate">
                        {report.name}
                      </h5>
                      <p className="text-xs text-muted-foreground">{report.type}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="bg-success/10 text-success border-success/20 text-xs"
                    >
                      {report.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{report.created}</span>
                    <span>{report.sections} sections</span>
                  </div>
                  <Separator className="my-2 bg-border-light" />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      <Mail className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}