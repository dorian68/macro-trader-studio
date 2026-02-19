import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function ChartProviderSettings() {
  const [provider, setProvider] = useState<'twelvedata' | 'tradingview'>('twelvedata');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentProvider();
  }, []);

  const fetchCurrentProvider = async () => {
    const { data, error } = await supabase
      .from('chart_provider_settings')
      .select('provider')
      .single();

    if (!error && data) {
      setProvider(data.provider as 'twelvedata' | 'tradingview');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: settingData } = await supabase
        .from('chart_provider_settings')
        .select('id')
        .single();

      if (!settingData) {
        toast({
          title: 'Error',
          description: 'Chart settings not initialized',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('chart_provider_settings')
        .update({ 
          provider, 
          updated_at: new Date().toISOString(),
          updated_by: user.user?.id 
        })
        .eq('id', settingData.id);

      if (error) throw error;

      toast({
        title: 'Chart Provider Updated',
        description: `All users will now see ${provider === 'twelvedata' ? 'TwelveData' : 'TradingView'} charts.`,
      });
    } catch (error) {
      console.error('Error updating chart provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to update chart provider',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Chart Provider Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Active Chart Provider</label>
          <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="twelvedata">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  TwelveData (Real-time WebSocket)
                </div>
              </SelectItem>
              <SelectItem value="tradingview">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-warning" />
                  TradingView (Fallback Widget)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-3 bg-muted rounded-lg text-sm">
          <p className="font-medium mb-1">Current Status:</p>
          <Badge variant={provider === 'twelvedata' ? 'default' : 'secondary'}>
            {provider === 'twelvedata' ? 'TwelveData Active' : 'TradingView Fallback'}
          </Badge>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save Chart Provider'}
        </Button>
      </CardContent>
    </Card>
  );
}
