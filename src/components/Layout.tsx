import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Menu, X, ChevronRight, ChevronDown, Activity, Zap, User, LogOut, Building2, Shield, FileText, History, Calculator, FlaskConical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BubbleSystem } from "./BubbleSystem";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useResultNotifications } from "@/hooks/useResultNotifications";
import { DiscreetJobStatus } from "./DiscreetJobStatus";
import { CreditsNavbar } from "./CreditsNavbar";
import { usePersistentNotifications } from "./PersistentNotificationProvider";
import AURA from "./AURA";
import { useLocation } from "react-router-dom";
import { useAURAContext } from "@/contexts/AURAContextProvider";
import { useTranslation } from "react-i18next";
interface LayoutProps {
  children: React.ReactNode;
  activeModule?: string;
  onModuleChange?: (module: string) => void;
  completedJobsCount?: number;
  onResetJobsCount?: () => void;
  activeJobsCount?: number;
}
export default function Layout({
  children,
  activeModule,
  onModuleChange,
  completedJobsCount = 0,
  onResetJobsCount,
  activeJobsCount = 0
}: LayoutProps) {
  const { t } = useTranslation('common');
  const [selectedAsset, setSelectedAsset] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("4h");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAURAExpanded, setIsAURAExpanded] = useState(false);
  const {
    user,
    signOut
  } = useAuth();
  const {
    isAdmin,
    isSuperUser
  } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextData } = useAURAContext();

  // Result notification system
  const { markResultsAsSeen } = useResultNotifications();
  
  // Get latest progress message from active jobs
  const { activeJobs } = usePersistentNotifications();
  const latestMessage = activeJobs[activeJobs.length - 1]?.progressMessage;
  
  // Detect context from current route
  const auraContext = useMemo(() => {
    const path = location.pathname;
    if (path.includes('backtester')) return 'Backtester';
    if (path.includes('portfolio')) return 'Portfolio Analytics';
    if (path.includes('scenario')) return 'Scenario Simulator';
    if (path.includes('trading-dashboard')) return 'Trading Dashboard';
    if (path.includes('macro-analysis')) return 'Macro Analysis';
    return 'default';
  }, [location.pathname]);
  return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 overflow-x-hidden">
      {/* Mobile-First Responsive Header */}
      <header className="sticky top-[calc(env(safe-area-inset-top))] z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 h-14 sm:h-16 border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="h-full px-4 sm:px-6 max-w-screen-lg mx-auto">
          <div className="flex items-center h-full">
            {/* Logo - Mobile optimized */}
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 sm:gap-2 hover:opacity-90 transition-all duration-200 group">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 shrink-0 p-1">
                <img src="/lovable-uploads/56d2c4af-fb26-47d8-8419-779a1da01775.png" alt="alphaLens.ai" className="w-full h-full object-contain" />
              </div>
              <div className="hidden xs:flex flex-col items-center shrink-0">
                <img src="/lovable-uploads/Only_text_white_BG_FINAL-2.png" alt="alphaLens.ai" className="h-5 sm:h-8 w-auto object-contain max-w-none" />
                <p className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">AI Trading Intelligence</p>
              </div>
            </button>

            {/* Credits Display - Rapproché des logos */}
            {user && <div className="ml-1">
                <CreditsNavbar />
              </div>}

            {/* Spacer pour pousser les éléments à droite */}
            <div className="flex-1" />

            {/* Desktop Navigation Items */}
            <div className="hidden lg:flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/alphalens-labs')}
                className="h-8 px-3"
              >
                <Calculator className="h-4 w-4 mr-2" />
                AlphaLens Labs
              </Button>
              {isSuperUser && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/forecast-playground')}
                  className="h-8 px-3"
                >
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Forecast Lab
                </Button>
              )}
            </div>

            {/* Mobile Navigation + Auth + Status */}
            <div className="flex items-center gap-2">
              {/* AI History Button with Notification Counter */}
              {user && <Button variant="ghost" size="sm" onClick={() => {
              navigate('/history');
              onResetJobsCount?.();
              markResultsAsSeen();
            }} className="relative h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-2 hidden md:inline-flex">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{t('nav.history', { defaultValue: 'History' })}</span>
                    {completedJobsCount > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem]">
                        {completedJobsCount > 9 ? '9+' : completedJobsCount}
                      </span>}
                  </Button>}

              {/* Auth Section */}
              {user ? <div className="flex items-center gap-2">
                  {(isAdmin || isSuperUser) && <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="hidden sm:flex items-center gap-2 h-8 px-3">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm">{t('nav.admin', { defaultValue: 'Admin' })}</span>
                    </Button>}
                  <div className="hidden sm:block">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-3 text-sm">
                          {t('nav.aboutUs', { defaultValue: 'About Us' })}
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 bg-white">
                        <DropdownMenuItem onClick={() => navigate("/about")} className="cursor-pointer">
                          {t('nav.about')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/features")} className="cursor-pointer">
                          {t('nav.features')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/pricing")} className="cursor-pointer">
                          {t('nav.pricing')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/contact")} className="cursor-pointer">
                          {t('nav.contact')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button variant="ghost" size="sm" onClick={signOut} className="h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-2">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{t('actions.signOut')}</span>
                  </Button>
                </div> : <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="h-8 px-3">
                  <User className="h-4 w-4 mr-2" />
                  <span className="text-sm">{t('actions.signIn')}</span>
                </Button>}

              {/* Mobile Menu Button */}
              <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden h-8 w-8 sm:h-10 sm:w-10 p-0">
                {isMobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>

              {/* Status Indicator - Always visible but adapted */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-card/50 px-2 py-1 rounded-full border border-border/50">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="hidden sm:inline whitespace-nowrap">{t('status.liveMarkets')}</span>
                <span className="sm:hidden">●</span>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && <div className="absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-xl md:hidden z-40">
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  {/* Public navigation items */}
                  <Button variant="outline" size="sm" onClick={() => {
                navigate('/about');
                setIsMobileMenuOpen(false);
              }} className="justify-start text-sm">
                    <Building2 className="h-4 w-4 mr-2" />
                    {t('nav.about')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                navigate('/features');
                setIsMobileMenuOpen(false);
              }} className="justify-start text-sm">
                    <Zap className="h-4 w-4 mr-2" />
                    {t('nav.features')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                navigate('/pricing');
                setIsMobileMenuOpen(false);
              }} className="justify-start text-sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {t('nav.pricing')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                navigate('/contact');
                setIsMobileMenuOpen(false);
              }} className="justify-start text-sm">
                    <FileText className="h-4 w-4 mr-2" />
                    {t('nav.contact')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                navigate('/alphalens-labs');
                setIsMobileMenuOpen(false);
              }} className="justify-start text-sm">
                    <Calculator className="h-4 w-4 mr-2" />
                    AlphaLens Labs
                  </Button>
                  {isSuperUser && (
                    <Button variant="outline" size="sm" onClick={() => {
                      navigate('/forecast-playground');
                      setIsMobileMenuOpen(false);
                    }} className="justify-start text-sm">
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Forecast Lab
                    </Button>
                  )}
                  
                  {/* App navigation items for authenticated users */}
                  {user && <>
                      <Button variant="outline" size="sm" onClick={() => {
                  navigate('/dashboard');
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm">
                        <Activity className="h-4 w-4 mr-2" />
                        {t('nav.dashboard')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                  navigate('/history');
                  markResultsAsSeen();
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm relative">
                        <History className="h-4 w-4 mr-2" />
                        {t('nav.history', { defaultValue: 'History' })}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                  navigate('/macro-analysis');
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        {t('nav.macroAnalysis', { defaultValue: 'Macro Analysis' })}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                  navigate('/reports');
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm">
                        <Activity className="h-4 w-4 mr-2" />
                        {t('nav.reports', { defaultValue: 'Reports' })}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                  onModuleChange?.("ai-setup");
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm">
                        <Zap className="h-4 w-4 mr-2" />
                        {t('nav.aiSetup', { defaultValue: 'AI Setup' })}
                      </Button>
                      {(isAdmin || isSuperUser) && <Button variant="outline" size="sm" onClick={() => {
                  navigate('/admin');
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm">
                          <Shield className="h-4 w-4 mr-2" />
                          {t('nav.adminPanel', { defaultValue: 'Admin Panel' })}
                        </Button>}
                    </>}
                </div>
                <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30 truncate">
                  {selectedAsset} • {timeframe}
                </div>
              </div>
            </div>}
        </div>
      </header>

      {/* Discreet Job Status - shows when jobs are running */}
      <DiscreetJobStatus 
        activeJobsCount={activeJobsCount} 
        latestMessage={latestMessage}
      />

      {/* Main Content - Mobile responsive */}
      <main className="flex-1 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
          {/* Mobile-first container with proper spacing */}
          <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-4 sm:py-6">
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

      {/* Global AURA Assistant */}
      {user && (
      <AURA 
        context={auraContext}
        contextData={contextData}
        isExpanded={isAURAExpanded}
        onToggle={() => setIsAURAExpanded(!isAURAExpanded)}
      />
      )}
    </div>;
}