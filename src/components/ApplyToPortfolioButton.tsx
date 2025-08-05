import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, Info } from 'lucide-react';

interface ApplyToPortfolioButtonProps {
  analysisContent: string;
  analysisType: 'macro' | 'asset' | 'report';
  assetSymbol?: string;
  className?: string;
}

export default function ApplyToPortfolioButton({ 
  analysisContent, 
  analysisType, 
  assetSymbol,
  className 
}: ApplyToPortfolioButtonProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleClick = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to access personalized recommendations",
        variant: "destructive"
      });
      return;
    }
    
    setOpen(true);
    toast({
      title: "Information",
      description: "Please run the database migration first to enable personalized recommendations."
    });
  };

  return (
    <>
      <Button variant="outline" onClick={handleClick} className={className}>
        <TrendingUp className="h-4 w-4 mr-2" />
        Apply to Portfolio
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Personalized Recommendations
            </DialogTitle>
            <DialogDescription>
              Feature pending database migration
            </DialogDescription>
          </DialogHeader>

          <Card>
            <CardHeader>
              <CardTitle>Migration Required</CardTitle>
              <CardDescription>
                AI-powered personalized recommendations will be available after running the database migration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Upcoming features:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Personalized macro-economic recommendations</li>
                  <li>• Targeted actions for your positions</li>
                  <li>• Contextual adjustments based on market conditions</li>
                  <li>• Risk analysis and optimal allocation</li>
                </ul>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <strong>Current analysis:</strong> {analysisType}
                {assetSymbol && (
                  <>
                    <br />
                    <strong>Asset:</strong> {assetSymbol}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}