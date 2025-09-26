import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserCredits {
  credits_queries_remaining: number;
  credits_ideas_remaining: number;
  credits_reports_remaining: number;
  plan_type: string;
  last_reset_date: string;
}

interface PlanParameters {
  plan_type: string;
  max_queries: number;
  max_ideas: number;
  max_reports: number;
}

interface UserPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    user_id: string;
    email?: string;
    user_plan?: string;
  } | null;
  onRefresh: () => void;
}

export function UserPlanDialog({
  isOpen,
  onClose,
  user,
  onRefresh
}: UserPlanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [planParameters, setPlanParameters] = useState<PlanParameters[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [customCredits, setCustomCredits] = useState({
    queries: '',
    ideas: '',
    reports: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      loadUserData();
      loadPlanParameters();
    }
  }, [isOpen, user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      // Load user credits
      const { data: credits, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setUserCredits(credits);
      setSelectedPlan(user.user_plan || 'free_trial');
      
      if (credits) {
        setCustomCredits({
          queries: credits.credits_queries_remaining.toString(),
          ideas: credits.credits_ideas_remaining.toString(),
          reports: credits.credits_reports_remaining.toString()
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    }
  };

  const loadPlanParameters = async () => {
    try {
      const { data, error } = await supabase
        .from('plan_parameters')
        .select('*');

      if (error) throw error;
      setPlanParameters(data || []);
    } catch (error) {
      console.error('Error loading plan parameters:', error);
    }
  };

  const handleUpdatePlan = async () => {
    if (!user || !selectedPlan) return;

    setLoading(true);
    try {
      // Update user plan in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ user_plan: selectedPlan as any })
        .eq('user_id', user.user_id);

      if (profileError) throw profileError;

      // Get plan parameters for the selected plan
      const selectedPlanParams = planParameters.find(p => p.plan_type === selectedPlan);
      
      if (selectedPlanParams) {
        // Update credits based on plan or custom values
        const creditsUpdate = {
          plan_type: selectedPlan,
          credits_queries_remaining: customCredits.queries ? parseInt(customCredits.queries) : selectedPlanParams.max_queries,
          credits_ideas_remaining: customCredits.ideas ? parseInt(customCredits.ideas) : selectedPlanParams.max_ideas,
          credits_reports_remaining: customCredits.reports ? parseInt(customCredits.reports) : selectedPlanParams.max_reports,
          last_reset_date: new Date().toISOString()
        };

        // Upsert user credits
        const { error: creditsError } = await supabase
          .from('user_credits')
          .upsert({
            ...creditsUpdate,
            user_id: user.user_id
          } as any);

        if (creditsError) throw creditsError;
      }

      toast({
        title: "Success",
        description: "User plan and credits updated successfully",
      });

      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error updating user plan:', error);
      toast({
        title: "Error",
        description: "Failed to update user plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefaults = () => {
    const selectedPlanParams = planParameters.find(p => p.plan_type === selectedPlan);
    if (selectedPlanParams) {
      setCustomCredits({
        queries: selectedPlanParams.max_queries.toString(),
        ideas: selectedPlanParams.max_ideas.toString(),
        reports: selectedPlanParams.max_reports.toString()
      });
    }
  };

  if (!user) return null;

  const selectedPlanParams = planParameters.find(p => p.plan_type === selectedPlan);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User Plan & Credits</DialogTitle>
          <DialogDescription>
            Update subscription plan and credit allocations for {user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          {userCredits && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Current Status</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Plan: <span className="font-mono">{userCredits.plan_type}</span></div>
                <div>Last Reset: <span className="font-mono">{new Date(userCredits.last_reset_date).toLocaleDateString()}</span></div>
                <div>Queries: <span className="font-mono">{userCredits.credits_queries_remaining}</span></div>
                <div>Ideas: <span className="font-mono">{userCredits.credits_ideas_remaining}</span></div>
                <div>Reports: <span className="font-mono">{userCredits.credits_reports_remaining}</span></div>
              </div>
            </div>
          )}

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="plan">Subscription Plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free_trial">Free Trial</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="broker_free">Broker Free</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plan Defaults */}
          {selectedPlanParams && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Plan Defaults</h4>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleResetToDefaults}
                  className="h-6 px-2 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>Queries: {selectedPlanParams.max_queries}</div>
                <div>Ideas: {selectedPlanParams.max_ideas}</div>
                <div>Reports: {selectedPlanParams.max_reports}</div>
              </div>
            </div>
          )}

          {/* Custom Credits */}
          <div className="space-y-3">
            <Label>Custom Credit Override</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="queries" className="text-xs">Queries</Label>
                <Input
                  id="queries"
                  type="number"
                  value={customCredits.queries}
                  onChange={(e) => setCustomCredits(prev => ({ ...prev, queries: e.target.value }))}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="ideas" className="text-xs">Ideas</Label>
                <Input
                  id="ideas"
                  type="number"
                  value={customCredits.ideas}
                  onChange={(e) => setCustomCredits(prev => ({ ...prev, ideas: e.target.value }))}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="reports" className="text-xs">Reports</Label>
                <Input
                  id="reports"
                  type="number"
                  value={customCredits.reports}
                  onChange={(e) => setCustomCredits(prev => ({ ...prev, reports: e.target.value }))}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpdatePlan} disabled={loading || !selectedPlan}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Update Plan & Credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}