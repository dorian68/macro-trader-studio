import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  FileText, 
  Menu,
  X
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <button
              onClick={() => onModuleChange("welcome")}
              className="flex items-center gap-3 hover:opacity-80 transition-smooth"
            >
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">TradeAI Pro</h1>
                <p className="text-xs text-muted-foreground">AI Trading Assistant</p>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              Live Markets
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "h-[calc(100vh-4rem)] border-r border-border bg-card/30 backdrop-blur-sm transition-all duration-300",
          sidebarOpen ? "w-80" : "w-0 md:w-20",
          "overflow-hidden"
        )}>
          <div className="p-6">
            <nav className="space-y-2">
              {modules.map((module) => {
                const isActive = activeModule === module.id;
                const Icon = module.icon;
                
                return (
                  <button
                    key={module.id}
                    onClick={() => onModuleChange(module.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-smooth group",
                      isActive 
                        ? "bg-primary/10 border border-primary/20 text-primary shadow-glow-primary" 
                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 transition-smooth",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    {sidebarOpen && (
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium text-sm",
                          isActive ? "text-primary" : "text-foreground"
                        )}>
                          {module.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {module.description}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}