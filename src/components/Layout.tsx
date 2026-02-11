import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TrendingUp, Menu, X, ChevronDown, Activity, Zap, User, LogOut, Building2, Shield, FileText, History, Calculator } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  fillViewport?: boolean;
  activeModule?: string;
  onModuleChange?: (module: string) => void;
  completedJobsCount?: number;
  onResetJobsCount?: () => void;
  activeJobsCount?: number;
}
export default function Layout({
  children,
  fillViewport = false,
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
  // PERF: Defer AURA mounting to prioritize main content
  const [auraReady, setAuraReady] = useState(false);
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

  // PERF: Prefetch route chunks on hover for near-instant navigation
  const prefetchedRef = useRef<Set<string>>(new Set());
  const prefetchRoute = useCallback((path: string) => {
    if (prefetchedRef.current.has(path)) return;
    prefetchedRef.current.add(path);
    const routeMap: Record<string, () => Promise<any>> = {
      '/dashboard': () => import('@/pages/Dashboard'),
      '/trade-generator': () => import('@/pages/ForecastTradeGenerator'),
      '/macro-lab': () => import('@/pages/ForecastMacroLab'),
      '/macro-analysis': () => import('@/pages/MacroAnalysis'),
      '/reports': () => import('@/pages/Reports'),
      '/history': () => import('@/pages/History'),
    };
    routeMap[path]?.();
  }, []);

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

  // PERF: Defer AURA mount by 100ms to prioritize main content rendering
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => setAuraReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      setAuraReady(false);
    }
  }, [user]);
  return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 overflow-x-hidden">
    {/* Mobile-First Responsive Header */}
    <header className="sticky top-[calc(env(safe-area-inset-top))] z-40 border-b border-white/5 bg-background shadow-sm h-14 sm:h-16">
      <div className="h-full px-4 sm:px-6 max-w-screen-lg mx-auto">
        <div className="flex items-center h-full">
          {/* Logo - Mobile optimized */}
          <button onClick={() => navigate('/dashboard')} onMouseEnter={() => prefetchRoute('/dashboard')} className="flex items-center gap-2 hover:opacity-90 transition-all duration-200 group">
            <img src="/header_logo.png" alt="alphaLens.ai" className="h-10 sm:h-14 w-auto object-contain" />
          </button>

          {/* Credits Display - Rapproché des logos */}
          {user && <div className="ml-1">
            <CreditsNavbar />
          </div>}

          {/* Spacer pour pousser les éléments à droite */}
          <div className="flex-1" />

          {/* Desktop Navigation Items */}
          <div className="hidden lg:flex items-center gap-1">
            {isSuperUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/alphalens-labs')}
                className="h-8 px-3"
              >
                <Calculator className="h-4 w-4 mr-2" />
                AlphaLens Labs
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
            }} onMouseEnter={() => prefetchRoute('/history')} className="relative h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-2 hidden md:inline-flex">
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
                  <DropdownMenuContent align="start" className="w-48">
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
              {/* Resources */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">Resources</p>
              <Button variant="outline" size="sm" onClick={() => {
                navigate('/about');
                setIsMobileMenuOpen(false);
              }} className="justify-start text-sm min-h-[44px]">
                <Building2 className="h-4 w-4 mr-2" />
                {t('nav.about')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                navigate('/features');
                setIsMobileMenuOpen(false);
              }} className="justify-start text-sm min-h-[44px]">
                <Zap className="h-4 w-4 mr-2" />
                {t('nav.features')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                navigate('/pricing');
                setIsMobileMenuOpen(false);
              }} className="justify-start text-sm min-h-[44px]">
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('nav.pricing')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                navigate('/contact');
                setIsMobileMenuOpen(false);
              }} className="justify-start text-sm min-h-[44px]">
                <FileText className="h-4 w-4 mr-2" />
                {t('nav.contact')}
              </Button>

              {/* App navigation items for authenticated users */}
              {user && <>
                <div className="border-t border-border/30 my-2" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Platform</p>
                <Button variant="outline" size="sm" onClick={() => {
                  navigate('/dashboard');
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm min-h-[44px]">
                  <Activity className="h-4 w-4 mr-2" />
                  {t('nav.dashboard')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  navigate('/trade-generator');
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm min-h-[44px]">
                  <Zap className="h-4 w-4 mr-2" />
                  {t('nav.aiSetup', { defaultValue: 'Trade Generator' })}
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  navigate('/history');
                  markResultsAsSeen();
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm relative min-h-[44px]">
                  <History className="h-4 w-4 mr-2" />
                  {t('nav.history', { defaultValue: 'History' })}
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  navigate('/macro-analysis');
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm min-h-[44px]">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t('nav.macroAnalysis', { defaultValue: 'Macro Analysis' })}
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  navigate('/reports');
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm min-h-[44px]">
                  <FileText className="h-4 w-4 mr-2" />
                  {t('nav.reports', { defaultValue: 'Reports' })}
                </Button>
                {isSuperUser && (
                  <Button variant="outline" size="sm" onClick={() => {
                    navigate('/alphalens-labs');
                    setIsMobileMenuOpen(false);
                  }} className="justify-start text-sm min-h-[44px]">
                    <Calculator className="h-4 w-4 mr-2" />
                    AlphaLens Labs
                  </Button>
                )}
                {(isAdmin || isSuperUser) && <Button variant="outline" size="sm" onClick={() => {
                  navigate('/admin');
                  setIsMobileMenuOpen(false);
                }} className="justify-start text-sm min-h-[44px]">
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
      <div className={cn(
          fillViewport
            ? "lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden"
            : "",
          "min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]"
        )}>
        {/* Mobile-first container with proper spacing */}
        <div className={cn(
          "px-4 sm:px-6 py-2 sm:py-3",
          fillViewport
            ? "lg:max-w-[1920px] lg:h-full lg:flex lg:flex-col"
            : "max-w-screen-lg",
          "mx-auto"
        )}>
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

    {/* Global AURA Assistant - PERF: Deferred mount for faster first paint */}
    {user && auraReady && (
      <AURA
        context={auraContext}
        contextData={contextData}
        isExpanded={isAURAExpanded}
        onToggle={() => setIsAURAExpanded(!isAURAExpanded)}
      />
    )}
  </div>;
}