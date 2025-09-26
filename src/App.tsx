import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSessionManager } from "@/hooks/useSessionManager";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { JobStatusCards } from "@/components/JobStatusCards";
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
import Admin from "./pages/Admin";
import About from "./pages/About";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import Credits from "./pages/Credits";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionManagerProvider>
          <TooltipProvider>
            <GlobalLoadingProvider>
              <JobStatusCards />
              <Toaster />
              <Sonner />
              <BrowserRouter>
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
                  <Route path="/admin" element={<AuthGuard requireApproval><AdminGuard><Admin /></AdminGuard></AuthGuard>} />
                  <Route path="/credits" element={<AuthGuard requireApproval><Credits /></AuthGuard>} />
                  <Route path="/about" element={<About />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/product" element={<ProductPresentation />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </GlobalLoadingProvider>
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
