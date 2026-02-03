import React, { createContext, useContext, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingCardsManager } from "./LoadingCard";
import { useLoadingManager } from "@/hooks/useLoadingManager";

interface LoadingContextType {
  createRequest: (
    type: 'ai_trade_setup' | 'macro_commentary' | 'reports',
    instrument: string,
    requestContent: string,
    parameters?: any
  ) => Promise<string>;
  updateRequest: (id: string, updates: any) => void;
  removeRequest: (id: string) => void;
  startProcessing: (id: string) => NodeJS.Timeout;
  completeRequest: (id: string, resultData: any) => void;
  failRequest: (id: string, error?: string) => void;
  getActiveRequests: () => any[];
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useGlobalLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
}

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export function GlobalLoadingProvider({ children }: GlobalLoadingProviderProps) {
  const loadingManager = useLoadingManager();
  const navigate = useNavigate();

  const handleViewResult = (request: any) => {
    console.log('📍 [ViewResult] Handling view result:', {
      type: request.type,
      id: request.id,
      hasData: !!request.resultData
    });

    // Store result in sessionStorage for the target page to pick up
    sessionStorage.setItem('pendingResult', JSON.stringify({
      type: request.type,
      jobId: request.jobId || request.id,
      resultData: request.resultData,
      instrument: request.instrument,
      timestamp: new Date().toISOString()
    }));

    // Navigate to the correct page based on request type
    const navigationMap: Record<string, string> = {
      'ai_trade_setup': '/ai-setup',
      'macro_commentary': '/macro-analysis',
      'reports': '/reports',
      'macro_lab': '/forecast-playground/macro-commentary',
      'trade_generator': '/forecast-playground/trade-generator'
    };

    const targetPath = navigationMap[request.type as keyof typeof navigationMap];
    if (targetPath) {
      console.log('📍 [ViewResult] Navigating to:', targetPath);
      navigate(targetPath);
    } else {
      console.error('❌ [ViewResult] Unknown request type:', request.type);
    }
  };

  return (
    <LoadingContext.Provider value={loadingManager}>
      {children}
      <LoadingCardsManager
        requests={loadingManager.getActiveRequests().map(req => ({
          ...req,
          onViewResult: req.status === 'completed' ? () => handleViewResult(req) : undefined,
          onRemove: loadingManager.removeRequest
        }))}
        onRequestUpdate={loadingManager.updateRequest}
        onRequestRemove={loadingManager.removeRequest}
      />
    </LoadingContext.Provider>
  );
}