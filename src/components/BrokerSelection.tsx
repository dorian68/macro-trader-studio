import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Broker {
  id: string;
  name: string;
  code?: string;
  logo_url?: string;
  status: string;
}

interface BrokerSelectionProps {
  onBrokerSelected?: (broker: Broker) => void;
  onSkip?: () => void;
  showSkipOption?: boolean;
}

const BrokerSelection: React.FC<BrokerSelectionProps> = ({ 
  onBrokerSelected, 
  onSkip, 
  showSkipOption = true 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error fetching brokers:', error);
        toast({
          title: "Error",
          description: "Failed to load brokers. Please refresh the page.",
          variant: "destructive"
        });
        return;
      }

      setBrokers(data || []);
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
      toast({
        title: "Error",
        description: "Unable to load brokers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBrokerSelect = async (broker: Broker) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to select a broker.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Update user profile with selected broker
      const { error } = await supabase
        .from('profiles')
        .update({
          broker_id: broker.id,
          broker_name: broker.name,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating broker:', error);
        toast({
          title: "Update Failed",
          description: "Failed to update broker selection. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Broker Selected",
        description: `You've successfully linked your account with ${broker.name}.`
      });

      // Call the callback function if provided
      if (onBrokerSelected) {
        onBrokerSelected(broker);
      }

    } catch (err) {
      console.error('Failed to update broker:', err);
      toast({
        title: "Error",
        description: "Unable to update broker selection. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Your Broker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading brokers...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Select Your Broker
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose your trading broker to receive personalized recommendations and optimize your trading experience.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {brokers.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active brokers available.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {brokers.map((broker) => (
              <div
                key={broker.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedBroker === broker.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setSelectedBroker(broker.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {broker.logo_url ? (
                      <img 
                        src={broker.logo_url} 
                        alt={`${broker.name} logo`}
                        className="w-10 h-10 object-contain rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{broker.name}</h4>
                      {broker.code && (
                        <Badge variant="outline" className="text-xs">
                          {broker.code}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {selectedBroker === broker.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={() => selectedBroker && handleBrokerSelect(brokers.find(b => b.id === selectedBroker)!)}
            disabled={!selectedBroker || submitting}
            className="flex-1"
          >
            {submitting ? "Saving..." : "Confirm Selection"}
          </Button>
          
          {showSkipOption && (
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={submitting}
            >
              Skip for Now
            </Button>
          )}
        </div>

        {/* Info Note */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Selecting a broker helps us provide more accurate trading recommendations 
            tailored to your platform's capabilities and fee structure.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrokerSelection;