import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';

interface RealtimeEvent {
  timestamp: string;
  type: string;
  channel: string;
  event: string;
  payload?: any;
  error?: string;
}

interface ChannelStatus {
  name: string;
  status: 'JOINING' | 'JOINED' | 'LEAVING' | 'CLOSED' | 'ERRORED' | 'SUBSCRIBED' | 'CHANNEL_ERROR';
  subscribedAt?: string;
  eventCount: number;
  lastEventAt?: string;
}

export function RealtimeDiagnostic() {
  const { user } = useAuth();
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [channels, setChannels] = useState<Map<string, ChannelStatus>>(new Map());
  const [isActive, setIsActive] = useState(false);
  const channelsRef = useRef<any[]>([]);

  const addEvent = (event: RealtimeEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
  };

  const updateChannelStatus = (channelName: string, status: Partial<ChannelStatus>) => {
    setChannels(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(channelName) || {
        name: channelName,
        status: 'JOINING' as const,
        eventCount: 0
      };
      newMap.set(channelName, { ...existing, ...status });
      return newMap;
    });
  };

  const startDiagnostic = () => {
    if (!user?.id) {
      addEvent({
        timestamp: new Date().toISOString(),
        type: 'ERROR',
        channel: 'system',
        event: 'no_user',
        error: 'User not authenticated'
      });
      return;
    }

    setIsActive(true);
    
    console.log('🔍 [RealtimeDiagnostic] Starting diagnostic for user:', user.id);
    
    addEvent({
      timestamp: new Date().toISOString(),
      type: 'INFO',
      channel: 'system',
      event: 'diagnostic_start',
      payload: { userId: user.id }
    });

    // Test 1: Jobs table realtime subscription
    const jobsChannel = supabase
      .channel('diagnostic-jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          addEvent({
            timestamp: new Date().toISOString(),
            type: 'REALTIME',
            channel: 'diagnostic-jobs',
            event: `postgres_changes.${payload.eventType}`,
            payload: {
              eventType: payload.eventType,
              old: payload.old,
              new: payload.new
            }
          });

          updateChannelStatus('diagnostic-jobs', {
            eventCount: (channels.get('diagnostic-jobs')?.eventCount || 0) + 1,
            lastEventAt: new Date().toISOString()
          });
        }
      );

    // Monitor channel state changes
    jobsChannel.subscribe((status, err) => {
      const timestamp = new Date().toISOString();
      
      updateChannelStatus('diagnostic-jobs', {
        status: status as any,
        subscribedAt: status === 'SUBSCRIBED' ? timestamp : undefined
      });

      addEvent({
        timestamp,
        type: status === 'SUBSCRIBED' ? 'SUCCESS' : status === 'CHANNEL_ERROR' ? 'ERROR' : 'INFO',
        channel: 'diagnostic-jobs',
        event: `channel_${status.toLowerCase()}`,
        payload: { status, error: err },
        error: err?.message
      });

      if (status === 'SUBSCRIBED') {
        console.log('✅ [RealtimeDiagnostic] Jobs channel subscribed successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ [RealtimeDiagnostic] Jobs channel error:', err);
      }
    });

    channelsRef.current.push(jobsChannel);

    // Test 2: Profile changes subscription
    const profileChannel = supabase
      .channel('diagnostic-profile')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          addEvent({
            timestamp: new Date().toISOString(),
            type: 'REALTIME',
            channel: 'diagnostic-profile',
            event: `postgres_changes.${payload.eventType}`,
            payload: payload
          });

          updateChannelStatus('diagnostic-profile', {
            eventCount: (channels.get('diagnostic-profile')?.eventCount || 0) + 1,
            lastEventAt: new Date().toISOString()
          });
        }
      );

    profileChannel.subscribe((status, err) => {
      const timestamp = new Date().toISOString();
      
      updateChannelStatus('diagnostic-profile', {
        status: status as any,
        subscribedAt: status === 'SUBSCRIBED' ? timestamp : undefined
      });

      addEvent({
        timestamp,
        type: status === 'SUBSCRIBED' ? 'SUCCESS' : status === 'CHANNEL_ERROR' ? 'ERROR' : 'INFO',
        channel: 'diagnostic-profile',
        event: `channel_${status.toLowerCase()}`,
        payload: { status, error: err },
        error: err?.message
      });
    });

    channelsRef.current.push(profileChannel);

    // Test 3: Check table permissions
    checkTablePermissions();
  };

  const checkTablePermissions = async () => {
    try {
      addEvent({
        timestamp: new Date().toISOString(),
        type: 'INFO',
        channel: 'system',
        event: 'checking_permissions',
        payload: { table: 'jobs' }
      });

      // Test read permission on jobs table with profile join
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id, status, created_at, user_id,
          profiles!inner(
            user_id,
            role,
            status,
            broker_name
          )
        `)
        .limit(3);

      addEvent({
        timestamp: new Date().toISOString(),
        type: jobsError ? 'ERROR' : 'SUCCESS',
        channel: 'system',
        event: 'jobs_read_test',
        payload: { count: jobsData?.length || 0 },
        error: jobsError?.message
      });

      // Test read permission on profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('user_id', user!.id)
        .limit(1);

      addEvent({
        timestamp: new Date().toISOString(),
        type: profileError ? 'ERROR' : 'SUCCESS',
        channel: 'system',
        event: 'profile_read_test',
        payload: { count: profileData?.length || 0 },
        error: profileError?.message
      });

    } catch (error: any) {
      addEvent({
        timestamp: new Date().toISOString(),
        type: 'ERROR',
        channel: 'system',
        event: 'permission_check_failed',
        error: error.message
      });
    }
  };

  const stopDiagnostic = () => {
    setIsActive(false);
    
    // Clean up all channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    addEvent({
      timestamp: new Date().toISOString(),
      type: 'INFO',
      channel: 'system',
      event: 'diagnostic_stop'
    });

    setChannels(new Map());
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const testJobCreation = async () => {
    if (!user?.id) return;

    try {
      const testJobId = `test-${Date.now()}`;
      
      addEvent({
        timestamp: new Date().toISOString(),
        type: 'INFO',
        channel: 'system',
        event: 'creating_test_job',
        payload: { jobId: testJobId }
      });

      // Create a test job
      const { error: insertError } = await supabase
        .from('jobs')
        .insert({
          id: testJobId,
          user_id: user.id,
          status: 'pending',
          feature: 'test',
          request_payload: { test: true, timestamp: new Date().toISOString() }
        });

      if (insertError) {
        addEvent({
          timestamp: new Date().toISOString(),
          type: 'ERROR',
          channel: 'system',
          event: 'test_job_create_failed',
          error: insertError.message
        });
        return;
      }

      // Wait a moment then update to completed
      setTimeout(async () => {
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            status: 'completed',
            response_payload: { test: 'response', completedAt: new Date().toISOString() }
          })
          .eq('id', testJobId);

        if (updateError) {
          addEvent({
            timestamp: new Date().toISOString(),
            type: 'ERROR',
            channel: 'system',
            event: 'test_job_update_failed',
            error: updateError.message
          });
        } else {
          addEvent({
            timestamp: new Date().toISOString(),
            type: 'SUCCESS',
            channel: 'system',
            event: 'test_job_updated',
            payload: { jobId: testJobId }
          });
        }
      }, 2000);

    } catch (error: any) {
      addEvent({
        timestamp: new Date().toISOString(),
        type: 'ERROR',
        channel: 'system',
        event: 'test_job_failed',
        error: error.message
      });
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ERROR': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'REALTIME': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChannelStatusIcon = (status: string) => {
    switch (status) {
      case 'SUBSCRIBED': 
      case 'JOINED': return <Wifi className="h-4 w-4 text-green-500" />;
      case 'CHANNEL_ERROR': 
      case 'ERRORED': return <WifiOff className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  useEffect(() => {
    return () => {
      stopDiagnostic();
    };
  }, []);

  if (!user) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>🔍 Diagnostic Realtime Supabase</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Utilisateur non connecté</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🔍 Diagnostic Realtime Supabase
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Actif" : "Inactif"}
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              {!isActive ? (
                <Button onClick={startDiagnostic} size="sm">
                  Démarrer le diagnostic
                </Button>
              ) : (
                <Button onClick={stopDiagnostic} variant="outline" size="sm">
                  Arrêter
                </Button>
              )}
              {isActive && (
                <Button onClick={testJobCreation} variant="outline" size="sm">
                  Test Job
                </Button>
              )}
              <Button onClick={clearEvents} variant="ghost" size="sm">
                Vider les logs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Utilisateur: {user.email} (ID: {user.id})
          </p>
        </CardContent>
      </Card>

      {/* Channels Status */}
      {isActive && channels.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📡 État des Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {Array.from(channels.entries()).map(([name, status]) => (
                <div key={name} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    {getChannelStatusIcon(status.status)}
                    <span className="font-medium">{name}</span>
                    <Badge variant={status.status === 'SUBSCRIBED' || status.status === 'JOINED' ? 'default' : 'secondary'}>
                      {status.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {status.eventCount} événements
                    {status.lastEventAt && (
                      <span className="ml-2">
                        (dernier: {new Date(status.lastEventAt).toLocaleTimeString()})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 Journal des événements</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun événement enregistré. Démarrez le diagnostic pour voir les événements.
              </p>
            ) : (
              <div className="space-y-2">
                {events.map((event, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded text-sm">
                    {getEventIcon(event.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{event.channel}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.event}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {event.payload && (
                        <pre className="text-xs text-muted-foreground bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      )}
                      {event.error && (
                        <div className="text-xs text-red-500 mt-1">
                          Erreur: {event.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}