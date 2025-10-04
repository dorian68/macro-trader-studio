import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSessionManager } from "@/hooks/useSessionManager";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PersistentNotificationProvider } from "@/components/PersistentNotificationProvider";
import { PersistentToast } from "@/components/PersistentToast";
import { JobStatusCards } from "@/components/JobStatusCards";
import { ScrollToTop } from "@/components/ScrollToTop";
import AdminGuard from "./components/AdminGuard";
import AuthGuard from "./components/AuthGuard";
import Homepage from "./pages/Homepage";
import Dashboard from "./pages/Dashboard";
import AISetup from "./pages/AISetup";
import MacroAnalysis from "./pages/MacroAnalysis";
import Reports from "./pages/Reports";
import AssetDetail from "./pages/AssetDetail";
import ProductPresentation from "./pages/ProductPresentation";
import Portfolio from "./pages/Portfolio";
import History from "./pages/History";
import Auth from "./pages/Auth";
import EmailConfirmation from "./pages/EmailConfirmation";
import EmailConfirmationSuccess from "./pages/EmailConfirmationSuccess";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import Credits from "./pages/Credits";
import PNLCalculatorPage from "./pages/PNLCalculatorPage";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Documentation from "./pages/Documentation";
import HelpCenter from "./pages/HelpCenter";
import API from "./pages/API";
import TestWebhook from "./pages/TestWebhook";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionManagerProvider>
          <TooltipProvider>
            <BrowserRouter>
              <ScrollToTop />
              <GlobalLoadingProvider>
                <PersistentNotificationProvider>
                  <JobStatusCards />
                  <PersistentToast />
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route path="/" element={<Homepage />} />
                    <Route path="/dashboard" element={<AuthGuard requireApproval><Dashboard /></AuthGuard>} />
                    <Route path="/asset/:symbol" element={<AssetDetail />} />
                    <Route path="/ai-setup" element={<AuthGuard requireApproval><AISetup /></AuthGuard>} />
                    <Route path="/macro-analysis" element={<AuthGuard requireApproval><MacroAnalysis /></AuthGuard>} />
                    <Route path="/reports" element={<AuthGuard requireApproval><Reports /></AuthGuard>} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/auth" element={<Auth />} />
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
                    <Route path="/pnl-calculator" element={<PNLCalculatorPage />} />
                    <Route path="/product" element={<ProductPresentation />} />
                    <Route path="/test-webhook" element={<AuthGuard><TestWebhook /></AuthGuard>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PersistentNotificationProvider>
              </GlobalLoadingProvider>
            </BrowserRouter>
          </TooltipProvider>
        </SessionManagerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Session Manager wrapper component
function SessionManagerProvider({ children }: { children: React.ReactNode }) {
  useSessionManager();
  return <>{children}</>;
}

export default App;
