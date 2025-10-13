import { createContext, useContext, ReactNode, useState } from 'react';
import { AURAContextData } from '@/lib/auraMessages';

interface AURAContextType {
  contextData: AURAContextData | undefined;
  setContextData: (data: AURAContextData | undefined) => void;
}

const AURAContext = createContext<AURAContextType | undefined>(undefined);

export function AURAContextProvider({ children }: { children: ReactNode }) {
  const [contextData, setContextData] = useState<AURAContextData | undefined>(undefined);
  
  return (
    <AURAContext.Provider value={{ contextData, setContextData }}>
      {children}
    </AURAContext.Provider>
  );
}

export function useAURAContext() {
  const context = useContext(AURAContext);
  if (!context) throw new Error('useAURAContext must be used within AURAContextProvider');
  return context;
}
