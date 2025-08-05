import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TradingDashboard from "./pages/TradingDashboard";
import AISetup from "./pages/AISetup";
import MacroAnalysis from "./pages/MacroAnalysis";
import Reports from "./pages/Reports";
import AssetDetail from "./pages/AssetDetail";
import ProductPresentation from "./pages/ProductPresentation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TradingDashboard />} />
          <Route path="/asset/:symbol" element={<AssetDetail />} />
          <Route path="/ai-setup" element={<AISetup />} />
          <Route path="/macro-analysis" element={<MacroAnalysis />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/product" element={<ProductPresentation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
