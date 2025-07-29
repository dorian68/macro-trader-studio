import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  FileText, 
  Menu,
  X,
  ChevronRight
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const modules = [
  {
    id: "commentary",
    name: "Macro Commentary",
    icon: TrendingUp,
    description: "Market analysis & insights"
  },
  {
    id: "trading",
    name: "Trading Dashboard",
    icon: BarChart3,
    description: "Technical analysis & trade ideas"
  },
  {
    id: "reports",
    name: "Reports",
    icon: FileText,
    description: "Export & generate reports"
  }
];

export function Layout({ children, activeModule, onModuleChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setSidebarCollapsed(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const getActiveModuleName = () => {
    const module = modules.find(m => m.id === activeModule);
    return module?.name || "Dashboard";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Modern Header */}
      <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="h-full px-4 lg:px-6">
          <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="hover:bg-accent/60 transition-all duration-200 hover:scale-105"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <button
                onClick={() => onModuleChange("welcome")}
                className="flex items-center gap-3 hover:opacity-90 transition-all duration-200 group"
              >
                <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
                  <TrendingUp className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-foreground">directionAI</h1>
                  <p className="text-xs text-muted-foreground">AI Trading Assistant</p>
                </div>
              </button>

              {/* Breadcrumb */}
              <div className="hidden md:flex items-center gap-2 ml-4">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{getActiveModuleName()}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-card/50 px-3 py-1.5 rounded-full border border-border/50">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                Live Markets
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Responsive Sidebar */}
        <aside className={cn(
          "h-[calc(100vh-4rem)] border-r border-border/50 bg-card/60 backdrop-blur-xl transition-all duration-300 ease-in-out z-40",
          isMobile 
            ? cn("fixed", sidebarOpen ? "w-72" : "w-0") 
            : cn("relative", sidebarCollapsed ? "w-16" : "w-72"),
          "overflow-hidden shadow-lg"
        )}>
          <div className={cn("p-4", sidebarCollapsed && !isMobile ? "px-2" : "")}>
            <nav className="space-y-1">
              {modules.map((module) => {
                const isActive = activeModule === module.id;
                const Icon = module.icon;
                
                return (
                  <button
                    key={module.id}
                    onClick={() => {
                      onModuleChange(module.id);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group relative",
                      "hover:bg-accent/60 hover:scale-[1.02] hover:shadow-sm",
                      isActive 
                        ? "bg-primary/15 border border-primary/30 text-primary shadow-lg shadow-primary/10" 
                        : "text-muted-foreground hover:text-foreground",
                      sidebarCollapsed && !isMobile ? "justify-center px-2" : ""
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 transition-all duration-200 flex-shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                      "group-hover:scale-110"
                    )} />
                    
                    {(!sidebarCollapsed || isMobile) && (
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium text-sm leading-tight",
                          isActive ? "text-primary" : "text-foreground"
                        )}>
                          {module.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                          {module.description}
                        </div>
                      </div>
                    )}

                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Collapse Toggle for Desktop */}
            {!isMobile && (
              <div className="mt-6 pt-4 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={cn(
                    "w-full justify-center hover:bg-accent/60 transition-all duration-200",
                    sidebarCollapsed ? "px-2" : ""
                  )}
                >
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    sidebarCollapsed ? "rotate-0" : "rotate-180"
                  )} />
                  {!sidebarCollapsed && <span className="ml-2 text-xs">Collapse</span>}
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content with Container */}
        <main className="flex-1 overflow-auto">
          <div className="min-h-[calc(100vh-4rem)]">
            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}