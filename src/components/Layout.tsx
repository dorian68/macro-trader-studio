import * as React from "react";
const { useState, useEffect } = React;
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Activity,
  Zap,
  User,
  LogOut,
  Building2,
  Shield,
  FileText,
  History
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BubbleSystem } from "./BubbleSystem";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { useResultNotifications } from "@/hooks/useResultNotifications";
import { ResultNotification } from "./ResultNotification";
import { DiscreetJobStatus } from "./DiscreetJobStatus";

interface LayoutProps {
  children: React.ReactNode;
  activeModule?: string;
  onModuleChange?: (module: string) => void;
  completedJobsCount?: number;
  onResetJobsCount?: () => void;
  activeJobsCount?: number;
}

export default function Layout({ children, activeModule, onModuleChange, completedJobsCount = 0, onResetJobsCount, activeJobsCount = 0 }: LayoutProps) {
  const [selectedAsset, setSelectedAsset] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("4h");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin, isSuperUser } = useProfile();
  const navigate = useNavigate();
  
  // Result notification system
  const { hasNewResults, notificationCount, markResultsAsSeen } = useResultNotifications();

  const handleViewResult = () => {
    markResultsAsSeen();
    navigate('/history');
  };

  const handleDismissNotification = () => {
    markResultsAsSeen();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 overflow-x-hidden">
      {/* Mobile-First Responsive Header */}
      <header className="sticky top-[calc(env(safe-area-inset-top))] z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 h-14 sm:h-16 border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="h-full px-4 sm:px-6 max-w-screen-lg mx-auto">
          <div className="flex items-center justify-between h-full">
            {/* Logo - Mobile optimized */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 hover:opacity-90 transition-all duration-200 group min-w-0"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 shrink-0 p-1">
                <img src="/lovable-uploads/56d2c4af-fb26-47d8-8419-779a1da01775.png" alt="alphaLens.ai" className="w-full h-full object-contain" />
              </div>
              <div className="hidden xs:block min-w-0">
                <img 
                  src="/lovable-uploads/Only_text_white_BG_FINAL-2.png" 
                  alt="alphaLens.ai" 
                  className="h-6 sm:h-8 w-auto"
                />
                <p className="text-xs text-muted-foreground hidden sm:block">AI Trading Intelligence</p>
              </div>
            </button>

            {/* Desktop Navigation Items - Empty for authenticated users */}
            <div className="hidden lg:flex items-center gap-1">
            </div>

            {/* Mobile Navigation + Auth + Status */}
            <div className="flex items-center gap-2">
              {/* AI History Button with Notification Counter */}
              {user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigate('/history');
                      onResetJobsCount?.();
                      markResultsAsSeen();
                    }}
                    className="relative h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-2 hidden md:inline-flex"
                  >
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">History</span>
                    {(completedJobsCount > 0 || notificationCount > 0) && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem]">
                        {Math.max(completedJobsCount, notificationCount) > 9 ? '9+' : Math.max(completedJobsCount, notificationCount)}
                      </span>
                    )}
                  </Button>
              )}

              {/* Auth Section */}
              {user ? (
                <div className="flex items-center gap-2">
                  {(isAdmin || isSuperUser) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/admin')}
                      className="hidden sm:flex items-center gap-2 h-8 px-3"
                    >
                      <Shield className="h-4 w-4" />
                      <span className="text-sm">Admin</span>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-3 text-sm">
                        About Us
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-white">
                      <DropdownMenuItem onClick={() => navigate("/about")} className="cursor-pointer">
                        About
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/features")} className="cursor-pointer">
                        Features
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/pricing")} className="cursor-pointer">
                        Pricing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/contact")} className="cursor-pointer">
                        Contact
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  {/* Public navigation items */}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate('/features');
                      setIsMobileMenuOpen(false);
                    }}
                    className="justify-start text-sm"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Features
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate('/pricing');
                      setIsMobileMenuOpen(false);
                    }}
                    className="justify-start text-sm"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Pricing
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate('/contact');
                      setIsMobileMenuOpen(false);
                    }}
                    className="justify-start text-sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                  
                  {/* App navigation items for authenticated users */}
                  {user && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate('/dashboard');
                          setIsMobileMenuOpen(false);
                        }}
                        className="justify-start text-sm"
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Trading Dashboard
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate('/history');
                          markResultsAsSeen();
                          setIsMobileMenuOpen(false);
                        }}
                        className="justify-start text-sm relative"
                      >
                        <History className="h-4 w-4 mr-2" />
                        History
                        {(notificationCount > 0) && (
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center min-w-[1rem]">
                            {notificationCount > 9 ? '9+' : notificationCount}
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate('/macro-analysis');
                          setIsMobileMenuOpen(false);
                        }}
                        className="justify-start text-sm"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Macro Analysis
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate('/reports');
                          setIsMobileMenuOpen(false);
                        }}
                        className="justify-start text-sm"
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Reports
                      </Button>
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
                      {(isAdmin || isSuperUser) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigate('/admin');
                            setIsMobileMenuOpen(false);
                          }}
                          className="justify-start text-sm"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Panel
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30 truncate">
                  {selectedAsset} • {timeframe}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Discreet Job Status - shows when jobs are running */}
      <DiscreetJobStatus activeJobsCount={activeJobsCount} />

      {/* Result Notification - shows when new results are available */}
      <ResultNotification 
        show={hasNewResults}
        onDismiss={handleDismissNotification}
        onViewResult={handleViewResult}
      />

      {/* Main Content - Mobile responsive */}
      <main className="flex-1 overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
          {/* Mobile-first container with proper spacing */}
          <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
            {children}
          </div>
        </div>
      </main>

      {/* Global Floating Bubble System - Mobile adapted - HIDDEN */}
      {/* <BubbleSystem 
        instrument={selectedAsset} 
        timeframe={timeframe} 
        onTradeSetupClick={() => onModuleChange?.("trading")}
      /> */}
    </div>
  );
}