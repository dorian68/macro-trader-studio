import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Homepage from "./pages/Homepage";
import Dashboard from "./pages/Dashboard";
import AISetup from "./pages/AISetup";
import MacroAnalysis from "./pages/MacroAnalysis";
import Reports from "./pages/Reports";
import AssetDetail from "./pages/AssetDetail";
import ProductPresentation from "./pages/ProductPresentation";
import Portfolio from "./pages/Portfolio";
import Auth from "./pages/Auth";
import About from "./pages/About";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/asset/:symbol" element={<AssetDetail />} />
            <Route path="/ai-setup" element={<AISetup />} />
            <Route path="/macro-analysis" element={<MacroAnalysis />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/about" element={<About />} />
            <Route path="/features" element={<Features />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/product" element={<ProductPresentation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
