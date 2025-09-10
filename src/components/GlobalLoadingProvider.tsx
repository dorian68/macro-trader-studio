import React, { createContext, useContext, ReactNode } from "react";
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
  onViewResult?: (data: any) => void;
}

export function GlobalLoadingProvider({ children, onViewResult }: GlobalLoadingProviderProps) {
  const loadingManager = useLoadingManager();

  const handleViewResult = (data: any) => {
    if (onViewResult) {
      onViewResult(data);
    }
  };

  return (
    <LoadingContext.Provider value={loadingManager}>
      {children}
      <LoadingCardsManager
        requests={loadingManager.getActiveRequests().map(req => ({
          ...req,
          onViewResult: req.status === 'completed' ? handleViewResult : undefined,
          onRemove: loadingManager.removeRequest
        }))}
        onRequestUpdate={loadingManager.updateRequest}
        onRequestRemove={loadingManager.removeRequest}
      />
    </LoadingContext.Provider>
  );
}