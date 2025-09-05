import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Menu,
  X,
  ChevronRight,
  Activity,
  Zap,
  User,
  LogOut,
  Building2
} from "lucide-react";
import { BubbleSystem } from "./BubbleSystem";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  activeModule?: string;
  onModuleChange?: (module: string) => void;
}

export default function Layout({ children, activeModule, onModuleChange }: LayoutProps) {
  const [selectedAsset, setSelectedAsset] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("4h");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Mobile-First Responsive Header */}
      <header className="h-14 sm:h-16 border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="h-full px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-full">
            {/* Logo - Mobile optimized */}
            <button
              onClick={() => onModuleChange("welcome")}
              className="flex items-center gap-2 hover:opacity-90 transition-all duration-200 group min-w-0"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 shrink-0 p-1">
                <img src="/lovable-uploads/a7975a0f-13fa-4e7b-91bb-de8563181e30.png" alt="AlphaLens" className="w-full h-full object-contain" />
              </div>
              <div className="hidden xs:block min-w-0">
                <img 
                  src="/lovable-uploads/1239e88a-26f6-4932-a1fc-da467e9c14c7.png" 
                  alt="AlphaLens" 
                  className="h-5 sm:h-6 w-auto"
                />
                <p className="text-xs text-muted-foreground hidden sm:block">AI Trading Intelligence</p>
              </div>
            </button>

            {/* Mobile Navigation + Auth + Status */}
            <div className="flex items-center gap-2">
              {/* Auth Section */}
              {user ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/portfolio')}
                    className="hidden sm:flex items-center gap-2 h-8 px-3"
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm">Portfolio</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Sign Out</span>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="h-8 px-3"
                >
                  <User className="h-4 w-4 mr-2" />
                  <span className="text-sm">Sign In</span>
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden h-8 w-8 sm:h-10 sm:w-10 p-0"
              >
                {isMobileMenuOpen ? (
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>

              {/* Status Indicator - Always visible but adapted */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-card/50 px-2 py-1 rounded-full border border-border/50">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="hidden sm:inline whitespace-nowrap">Live Markets</span>
                <span className="sm:hidden">●</span>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-xl md:hidden z-40">
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate('/');
                      setIsMobileMenuOpen(false);
                    }}
                    className="justify-start text-sm"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Trading Dashboard
                  </Button>
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigate('/portfolio');
                        setIsMobileMenuOpen(false);
                      }}
                      className="justify-start text-sm"
                    >
                      <User className="h-4 w-4 mr-2" />
                      My Portfolios
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onModuleChange?.("ai-setup");
                      setIsMobileMenuOpen(false);
                    }}
                    className="justify-start text-sm"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    AI Setup
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate('/about');
                      setIsMobileMenuOpen(false);
                    }}
                    className="justify-start text-sm"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    About
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30 truncate">
                  {selectedAsset} • {timeframe}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Mobile responsive */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
          {/* Mobile-first container with proper spacing */}
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-6">
            {children}
          </div>
        </div>
      </main>

      {/* Global Floating Bubble System - Mobile adapted */}
      <BubbleSystem 
        instrument={selectedAsset} 
        timeframe={timeframe} 
        onTradeSetupClick={() => onModuleChange?.("trading")}
      />
    </div>
  );
}