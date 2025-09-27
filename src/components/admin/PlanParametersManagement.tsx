import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save } from 'lucide-react';

interface PlanParameter {
  id: string;
  plan_type: 'basic' | 'standard' | 'premium' | 'free_trial' | 'broker_free';
  max_queries: number;
  max_ideas: number;
  max_reports: number;
  trial_duration_days: number | null;
  renewal_cycle_days: number | null;
  monthly_price_usd: number;
}

export function PlanParametersManagement() {
  const [plans, setPlans] = useState<PlanParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plan_parameters')
        .select('*')
        .order('plan_type');

      if (error) {
        console.error('Error fetching plans:', error);
        toast({
          title: "Error",
          description: "Failed to load plan parameters",
          variant: "destructive"
        });
        return;
      }

      setPlans(data || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePlan = async (planId: string, updates: Partial<PlanParameter>) => {
    setSaving(planId);
    try {
      const { error } = await supabase
        .from('plan_parameters')
        .update(updates)
        .eq('id', planId);

      if (error) {
        console.error('Error updating plan:', error);
        toast({
          title: "Error",
          description: "Failed to update plan parameters",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Plan parameters updated successfully",
      });

      await fetchPlans();
    } catch (err) {
      console.error('Error updating plan:', err);
    } finally {
      setSaving(null);
    }
  };

  const handleFieldChange = (planId: string, field: keyof PlanParameter, value: string) => {
    const numValue = field === 'monthly_price_usd' ? parseFloat(value) || 0 : parseInt(value) || 0;
    setPlans(prev => prev.map(plan => 
      plan.id === planId 
        ? { ...plan, [field]: numValue }
        : plan
    ));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Plan Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const planDisplayNames = {
    free_trial: 'Free Trial',
    broker_free: 'Broker Free',
    basic: 'Basic',
    standard: 'Standard',
    premium: 'Premium'
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Plan Parameters Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Configure credit limits and renewal cycles for each subscription plan. Changes apply to new credit cycles.
          </div>
        </CardContent>
      </Card>

      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader>
            <CardTitle>{planDisplayNames[plan.plan_type] || plan.plan_type}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor={`${plan.id}-price`}>Monthly Price (USD)</Label>
                <Input
                  id={`${plan.id}-price`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={plan.monthly_price_usd}
                  onChange={(e) => handleFieldChange(plan.id, 'monthly_price_usd', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor={`${plan.id}-queries`}>Max Queries</Label>
                <Input
                  id={`${plan.id}-queries`}
                  type="number"
                  min="0"
                  value={plan.max_queries}
                  onChange={(e) => handleFieldChange(plan.id, 'max_queries', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor={`${plan.id}-ideas`}>Max Investment Ideas</Label>
                <Input
                  id={`${plan.id}-ideas`}
                  type="number"
                  min="0"
                  value={plan.max_ideas}
                  onChange={(e) => handleFieldChange(plan.id, 'max_ideas', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor={`${plan.id}-reports`}>Max Reports</Label>
                <Input
                  id={`${plan.id}-reports`}
                  type="number"
                  min="0"
                  value={plan.max_reports}
                  onChange={(e) => handleFieldChange(plan.id, 'max_reports', e.target.value)}
                />
              </div>
            </div>

            {plan.plan_type === 'free_trial' && (
              <div>
                <Label htmlFor={`${plan.id}-trial`}>Trial Duration (Days)</Label>
                <Input
                  id={`${plan.id}-trial`}
                  type="number"
                  min="1"
                  value={plan.trial_duration_days || 7}
                  onChange={(e) => handleFieldChange(plan.id, 'trial_duration_days', e.target.value)}
                />
              </div>
            )}

            {(plan.plan_type === 'broker_free' || plan.plan_type === 'basic' || plan.plan_type === 'standard' || plan.plan_type === 'premium') && (
              <div>
                <Label htmlFor={`${plan.id}-renewal`}>Renewal Cycle (Days)</Label>
                <Input
                  id={`${plan.id}-renewal`}
                  type="number"
                  min="1"
                  value={plan.renewal_cycle_days || 30}
                  onChange={(e) => handleFieldChange(plan.id, 'renewal_cycle_days', e.target.value)}
                />
              </div>
            )}

            <Button 
              onClick={() => updatePlan(plan.id, plan)}
              disabled={saving === plan.id}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving === plan.id ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}