import { useEffect, useRef } from 'react';
import { MOCK_PROGRESS_SEQUENCES } from '@/utils/mockProgressMessages';

interface UseMockProgressSimulatorProps {
  jobId: string;
  feature: string;
  onProgressUpdate: (message: string) => void;
  isActive: boolean;
}

export function useMockProgressSimulator({
  jobId,
  feature,
  onProgressUpdate,
  isActive
}: UseMockProgressSimulatorProps) {
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (!isActive) {
      console.log(`🔇 [MockProgress] Simulator disabled for job ${jobId}`);
      return;
    }

    const sequence = MOCK_PROGRESS_SEQUENCES[feature];
    
    if (!sequence) {
      console.warn(`⚠️ [MockProgress] No sequence found for feature: ${feature}`);
      return;
    }

    console.log(`🎬 [MockProgress] Starting simulator for ${feature} (job: ${jobId})`);
    console.log(`📋 [MockProgress] Total messages: ${sequence.messages.length}, Duration: ${sequence.duration}ms`);

    let messageIndex = 0;
    
    const scheduleNextMessage = () => {
      if (messageIndex >= sequence.messages.length) {
        console.log(`✅ [MockProgress] Sequence completed for job ${jobId}`);
        return;
      }
      
      const msg = sequence.messages[messageIndex];
      const delay = Math.random() * (msg.maxDelay - msg.minDelay) + msg.minDelay;
      
      console.log(`⏱️ [MockProgress] Scheduling message ${messageIndex + 1}/${sequence.messages.length} in ${Math.round(delay)}ms`);
      
      const timeoutId = setTimeout(() => {
        console.log(`🔔 [MockProgress] ${feature} (${jobId}) - "${msg.text}"`);
        onProgressUpdate(msg.text);
        messageIndex++;
        scheduleNextMessage();
      }, delay);
      
      timeoutsRef.current.push(timeoutId);
    };
    
    scheduleNextMessage();
    
    return () => {
      console.log(`🧹 [MockProgress] Cleaning up ${timeoutsRef.current.length} timeouts for job ${jobId}`);
      timeoutsRef.current.forEach(id => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, [jobId, feature, isActive, onProgressUpdate]);
}
