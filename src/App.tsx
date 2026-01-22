import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { useSessionManager } from "@/hooks/useSessionManager";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PersistentNotificationProvider } from "@/components/PersistentNotificationProvider";
import { AURAContextProvider } from "@/contexts/AURAContextProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PersistentToast } from "@/components/PersistentToast";
import { JobStatusCards } from "@/components/JobStatusCards";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Skeleton } from "@/components/ui/skeleton";
import AdminGuard from "./components/AdminGuard";
import AuthGuard from "./components/AuthGuard";

// PERFORMANCE: Route-based code splitting with React.lazy
// Critical routes (loaded immediately)
import Homepage from "./pages/Homepage";
import Auth from "./pages/Auth";

// Secondary routes (lazy loaded)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AISetup = lazy(() => import("./pages/AISetup"));
const MacroAnalysis = lazy(() => import("./pages/MacroAnalysis"));
const Reports = lazy(() => import("./pages/Reports"));
const AssetDetail = lazy(() => import("./pages/AssetDetail"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const History = lazy(() => import("./pages/History"));
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

// Utility pages (lazy loaded)
const ProductPresentation = lazy(() => import("./pages/ProductPresentation"));
const EmailConfirmation = lazy(() => import("./pages/EmailConfirmation"));
const EmailConfirmationSuccess = lazy(() => import("./pages/EmailConfirmationSuccess"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const TestWebhook = lazy(() => import("./pages/TestWebhook"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Labs pages (lazy loaded)
const AlphaLensLabs = lazy(() => import("./pages/AlphaLensLabs"));
const PortfolioAnalytics = lazy(() => import("./pages/PortfolioAnalytics"));
const ScenarioSimulator = lazy(() => import("./pages/labs/ScenarioSimulator"));
const Backtester = lazy(() => import("./pages/labs/Backtester"));
const ForecastPlayground = lazy(() => import("./pages/ForecastPlayground"));
const ForecastPlaygroundTool = lazy(() => import("./pages/ForecastPlaygroundTool"));
const ForecastMacroLab = lazy(() => import("./pages/ForecastMacroLab"));

const queryClient = new QueryClient();
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
                  <GlobalLoadingProvider>
                    <PersistentNotificationProvider>
                  <JobStatusCards />
                  <PersistentToast />
                  <Toaster />
                  <Sonner />
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Skeleton className="h-96 w-full max-w-4xl" /></div>}>
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
                      <Route path="/email-confirmation" element={<EmailConfirmation />} />
                      <Route path="/email-confirmation-success" element={<EmailConfirmationSuccess />} />
                      <Route path="/payment-success" element={<PaymentSuccess />} />
                      <Route path="/payment-canceled" element={<PaymentCanceled />} />
                      <Route path="/admin" element={<AuthGuard requireApproval><AdminGuard><Admin /></AdminGuard></AuthGuard>} />
                      <Route path="/credits" element={<AuthGuard requireApproval><Credits /></AuthGuard>} />
                      <Route path="/about" element={<About />} />
                      <Route path="/features" element={<Features />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/documentation" element={<Documentation />} />
                      <Route path="/help-center" element={<HelpCenter />} />
                      <Route path="/api" element={<API />} />
                      <Route path="/alphalens-labs" element={<AuthGuard requireApproval><AlphaLensLabs /></AuthGuard>} />
                      <Route path="/portfolio-analytics" element={<PortfolioAnalytics />} />
                      <Route path="/labs/scenario-simulator" element={<ScenarioSimulator />} />
                      <Route path="/labs/backtester" element={<Backtester />} />
                      <Route path="/forecast-playground" element={<AuthGuard requireApproval><ForecastPlayground /></AuthGuard>} />
                      <Route path="/forecast-playground/tool" element={<AuthGuard requireApproval><ForecastPlaygroundTool /></AuthGuard>} />
                      <Route path="/forecast-playground/macro-commentary" element={<AuthGuard requireApproval><ForecastMacroLab /></AuthGuard>} />
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
