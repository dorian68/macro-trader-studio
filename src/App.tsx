import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { useSessionManager } from "@/hooks/useSessionManager";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PersistentNotificationProvider } from "@/components/PersistentNotificationProvider";
import { AURAContextProvider } from "@/contexts/AURAContextProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PersistentToast } from "@/components/PersistentToast";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Skeleton } from "@/components/ui/skeleton";
import { CursorGlow } from "@/components/CursorGlow";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import AdminGuard from "./components/AdminGuard";
import AuthGuard from "./components/AuthGuard";

// PERFORMANCE: Route-based code splitting with React.lazy
// Critical routes (loaded immediately)
import Homepage from "./pages/Homepage";
import Auth from "./pages/Auth";

// Secondary routes (lazy loaded)
// PERF: Critical routes with prefetch hints for faster navigation
const Dashboard = lazy(() => import(/* webpackPrefetch: true */ "./pages/Dashboard"));
const AISetup = lazy(() => import(/* webpackPrefetch: true */ "./pages/AISetup"));
const MacroAnalysis = lazy(() => import(/* webpackPrefetch: true */ "./pages/MacroAnalysis"));
const Reports = lazy(() => import(/* webpackPrefetch: true */ "./pages/Reports"));
const AssetDetail = lazy(() => import("./pages/AssetDetail"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const History = lazy(() => import(/* webpackPrefetch: true */ "./pages/History"));
const Admin = lazy(() => import("./pages/Admin"));
const Credits = lazy(() => import("./pages/Credits"));

// Public pages (lazy loaded)
const About = lazy(() => import("./pages/About"));
const Features = lazy(() => import("./pages/Features"));
const Contact = lazy(() => import("./pages/Contact"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Documentation = lazy(() => import("./pages/Documentation"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const API = lazy(() => import("./pages/API"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));

// Utility pages (lazy loaded)
const ProductPresentation = lazy(() => import("./pages/ProductPresentation"));
const EmailConfirmation = lazy(() => import("./pages/EmailConfirmation"));
const EmailConfirmationSuccess = lazy(() => import("./pages/EmailConfirmationSuccess"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const TestWebhook = lazy(() => import("./pages/TestWebhook"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Labs pages (lazy loaded)
const AlphaLensLabs = lazy(() => import("./pages/AlphaLensLabs"));
const PortfolioAnalytics = lazy(() => import("./pages/PortfolioAnalytics"));
const ScenarioSimulator = lazy(() => import("./pages/labs/ScenarioSimulator"));
const Backtester = lazy(() => import("./pages/labs/Backtester"));
const ForecastPlayground = lazy(() => import("./pages/ForecastPlayground"));
const ForecastPlaygroundTool = lazy(() => import("./pages/ForecastPlaygroundTool"));
const ForecastMacroLab = lazy(() => import("./pages/ForecastMacroLab"));
const ForecastTradeGenerator = lazy(() => import("./pages/ForecastTradeGenerator"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min — avoid refetch on navigation
      gcTime: 10 * 60 * 1000,       // 10 min — keep cached data longer
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
// Force rebuild after PersistentNotificationProvider interface update

const App = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SessionManagerProvider>
            <LanguageProvider>
              <AURAContextProvider>
                <TooltipProvider>
                  <BrowserRouter>
                    <ScrollToTop />
                    <GoogleAnalytics />
                    <CursorGlow />
                    <GlobalLoadingProvider>
                      <PersistentNotificationProvider>
                        <PersistentToast />
                        <Toaster />
                        <Sonner />
                        <Suspense fallback={<div className="min-h-screen bg-background"><div className="h-14 sm:h-16 border-b border-white/5 bg-background" /></div>}>
                          <Routes>
                            <Route path="/" element={<Homepage />} />
                            <Route path="/auth" element={<Auth />} />
                            <Route path="/dashboard" element={<AuthGuard requireApproval><Dashboard /></AuthGuard>} />
                            <Route path="/asset/:symbol" element={<AssetDetail />} />
                            <Route path="/ai-setup" element={<AuthGuard requireApproval><AISetup /></AuthGuard>} />
                            <Route path="/macro-analysis" element={<AuthGuard requireApproval><MacroAnalysis /></AuthGuard>} />
                            <Route path="/reports" element={<AuthGuard requireApproval><Reports /></AuthGuard>} />
                            <Route path="/portfolio" element={<Portfolio />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/email-confirmation" element={<EmailConfirmation />} />
                            <Route path="/confirm-success" element={<EmailConfirmationSuccess />} />
                            <Route path="/email-confirmation-success" element={<Navigate to="/confirm-success" replace />} />
                            <Route path="/payment-success" element={<PaymentSuccess />} />
                            <Route path="/payment-canceled" element={<PaymentCanceled />} />
                            <Route path="/admin" element={<AuthGuard requireApproval><AdminGuard><Admin /></AdminGuard></AuthGuard>} />
                            <Route path="/credits" element={<AuthGuard requireApproval><Credits /></AuthGuard>} />
                            <Route path="/about" element={<About />} />
                            <Route path="/blog" element={<Blog />} />
                            <Route path="/blog/category/:category" element={<Blog />} />
                            <Route path="/blog/page/:page" element={<Blog />} />
                            <Route path="/blog/:slug" element={<BlogPost />} />
                            <Route path="/features" element={<Features />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/pricing" element={<Pricing />} />
                            <Route path="/privacy" element={<Privacy />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/docs" element={<Documentation />} />
                            <Route path="/help" element={<HelpCenter />} />
                            <Route path="/api" element={<API />} />
                            <Route path="/labs" element={<AuthGuard requireApproval><AlphaLensLabs /></AuthGuard>} />
                            <Route path="/analytics" element={<PortfolioAnalytics />} />
                            <Route path="/labs/scenario-simulator" element={<ScenarioSimulator />} />
                            <Route path="/labs/backtester" element={<Backtester />} />
                            <Route path="/playground" element={<AuthGuard requireApproval><ForecastPlayground /></AuthGuard>} />
                            <Route path="/playground/tool" element={<AuthGuard requireApproval><ForecastPlaygroundTool /></AuthGuard>} />
                            <Route path="/trade-generator" element={<AuthGuard requireApproval><ForecastTradeGenerator /></AuthGuard>} />
                            <Route path="/macro-lab" element={<AuthGuard requireApproval><ForecastMacroLab /></AuthGuard>} />
                            {/* Legacy redirects for backward compatibility & SEO */}
                            <Route path="/documentation" element={<Navigate to="/docs" replace />} />
                            <Route path="/help-center" element={<Navigate to="/help" replace />} />
                            <Route path="/alphalens-labs" element={<Navigate to="/labs" replace />} />
                            <Route path="/portfolio-analytics" element={<Navigate to="/analytics" replace />} />
                            <Route path="/forecast-playground" element={<Navigate to="/playground" replace />} />
                            <Route path="/forecast-playground/tool" element={<Navigate to="/playground/tool" replace />} />
                            <Route path="/forecast-playground/macro-commentary" element={<Navigate to="/macro-lab" replace />} />
                            <Route path="/forecast-playground/trade-generator" element={<Navigate to="/trade-generator" replace />} />
                            <Route path="/coming-soon" element={<ComingSoon />} />
                            <Route path="/product" element={<ProductPresentation />} />
                            <Route path="/test-webhook" element={<AuthGuard><TestWebhook /></AuthGuard>} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                      </PersistentNotificationProvider>
                    </GlobalLoadingProvider>
                  </BrowserRouter>
                </TooltipProvider>
              </AURAContextProvider>
            </LanguageProvider>
          </SessionManagerProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

// Session Manager wrapper component
function SessionManagerProvider({ children }: { children: React.ReactNode }) {
  useSessionManager();
  return <>{children}</>;
}

export default App;
