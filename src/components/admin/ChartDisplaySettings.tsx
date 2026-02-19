import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DisplayOptions {
  showGrid: boolean;
  showPriceScale: boolean;
  showTimeScale: boolean;
  showVolume: boolean;
  showStudies: boolean;
  showToolbar: boolean;
}

const DEFAULT_OPTIONS: DisplayOptions = {
  showGrid: false,
  showPriceScale: true,
  showTimeScale: true,
  showVolume: false,
  showStudies: false,
  showToolbar: false,
};

const OPTION_LABELS: { key: keyof DisplayOptions; label: string; description: string }[] = [
  { key: 'showGrid', label: 'Grid Lines', description: 'Vertical and horizontal grid lines' },
  { key: 'showPriceScale', label: 'Price Scale', description: 'Right-side price axis' },
  { key: 'showTimeScale', label: 'Time Scale', description: 'Bottom time axis' },
  { key: 'showVolume', label: 'Volume Bars', description: 'Volume histogram below chart' },
  { key: 'showStudies', label: 'Studies (RSI/ADX)', description: 'Technical indicator overlays' },
  { key: 'showToolbar', label: 'Toolbar', description: 'TradingView top toolbar' },
];

export function ChartDisplaySettings() {
  const [options, setOptions] = useState<DisplayOptions>(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const { data, error } = await supabase
      .from('chart_provider_settings')
      .select('display_options')
      .single();

    if (!error && data?.display_options) {
      setOptions({ ...DEFAULT_OPTIONS, ...(data.display_options as Partial<DisplayOptions>) });
    }
  };

  const handleToggle = (key: keyof DisplayOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: settingData } = await supabase
        .from('chart_provider_settings')
        .select('id')
        .single();

      if (!settingData) {
        toast({ title: 'Error', description: 'Chart settings not initialized', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('chart_provider_settings')
        .update({
          display_options: options as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settingData.id);

      if (error) throw error;

      toast({ title: 'Display Settings Updated', description: 'Chart display preferences saved for all users.' });
    } catch (error) {
      console.error('Error updating display options:', error);
      toast({ title: 'Error', description: 'Failed to update display settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Chart Display Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {OPTION_LABELS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
            <div>
              <Label htmlFor={key} className="text-sm font-medium cursor-pointer">{label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <Switch
              id={key}
              checked={options[key]}
              onCheckedChange={() => handleToggle(key)}
            />
          </div>
        ))}

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save Display Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
