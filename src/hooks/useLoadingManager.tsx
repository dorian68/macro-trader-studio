import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const { useState, useCallback } = React;

interface LoadingRequest {
  id: string;
  type: 'ai_trade_setup' | 'macro_commentary' | 'reports';
  instrument: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  estimatedCompletion?: Date;
  resultData?: any;
  requestContent: string;
  parameters?: any;
  jobId?: string;
}

export function useLoadingManager() {
  const [requests, setRequests] = useState<LoadingRequest[]>([]);
  const { toast } = useToast();

  const createRequest = useCallback(async (
    type: LoadingRequest['type'],
    instrument: string,
    requestContent: string,
    parameters?: any
  ): Promise<string> => {
    const id = uuidv4();
    const startTime = new Date();
    // Dynamic estimation based on request type
    const estimationMinutes = {
      'ai_trade_setup': 2,
      'macro_commentary': 1.5,
      'reports': 3
    };
    const estimatedCompletion = new Date(Date.now() + (estimationMinutes[type] || 2) * 60000);

    const newRequest: LoadingRequest = {
      id,
      type,
      instrument,
      status: 'pending',
      progress: 0,
      startTime,
      estimatedCompletion,
      requestContent,
      parameters
    };

    setRequests(prev => [...prev, newRequest]);

    // Store in database
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase.from('user_requests').insert({
          id,
          user_id: user.user.id,
          request_type: type,
          instrument,
          parameters,
          request_content: requestContent,
          status: 'pending'
        });
      }
    } catch (error) {
      console.error('Error saving request to database:', error);
    }

    return id;
  }, []);

  const updateRequest = useCallback((id: string, updates: Partial<LoadingRequest>) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, ...updates } : req
    ));

    // Update database
    if (updates.status || updates.progress) {
      supabase.from('user_requests').update({
        status: updates.status,
        ...(updates.status === 'completed' && { completed_at: new Date().toISOString() }),
        ...(updates.resultData && { response_content: JSON.stringify(updates.resultData) })
      }).eq('id', id).then(({ error }) => {
        if (error) console.error('Error updating request in database:', error);
      });
    }
  }, []);

  const removeRequest = useCallback((id: string) => {
    setRequests(prev => prev.filter(req => req.id !== id));
  }, []);

  const simulateProgress = useCallback((id: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5; // 5-20% increments
      
      if (progress >= 100) {
        clearInterval(interval);
        updateRequest(id, { 
          status: 'completed', 
          progress: 100 
        });
        
        toast({
          title: "Analysis Complete",
          description: "Your request has been processed successfully"
        });
      } else {
        updateRequest(id, { 
          status: 'processing', 
          progress: Math.min(progress, 95) 
        });
      }
    }, Math.random() * 3000 + 2000); // 2-5 second intervals

    return interval;
  }, [updateRequest, toast]);

  const startProcessing = useCallback((id: string) => {
    updateRequest(id, { status: 'processing', progress: 5 });
    return simulateProgress(id);
  }, [updateRequest, simulateProgress]);

  const completeRequest = useCallback((id: string, resultData: any) => {
    updateRequest(id, { 
      status: 'completed', 
      progress: 100, 
      resultData 
    });
    
    toast({
      title: "Analysis Complete",
      description: "Your request has been processed successfully"
    });
  }, [updateRequest, toast]);

  const failRequest = useCallback((id: string, error?: string) => {
    updateRequest(id, { status: 'failed' });
    
    toast({
      title: "Analysis Failed",
      description: error || "The request could not be processed",
      variant: "destructive"
    });
  }, [updateRequest, toast]);

  const getActiveRequests = useCallback(() => {
    return requests.filter(req => req.status === 'pending' || req.status === 'processing');
  }, [requests]);

  const getCompletedRequests = useCallback(() => {
    return requests.filter(req => req.status === 'completed');
  }, [requests]);

  return {
    requests,
    createRequest,
    updateRequest,
    removeRequest,
    startProcessing,
    completeRequest,
    failRequest,
    getActiveRequests,
    getCompletedRequests
  };
}