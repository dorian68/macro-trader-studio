import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LabsComingSoonProps {
  title: string;
  description: string;
}

export function LabsComingSoon({ title, description }: LabsComingSoonProps) {
  const navigate = useNavigate();

  return (
    <div className="container-wrapper py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-muted rounded-full">
              <Lock className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-6 text-center">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              🚧 This feature is in private beta and will soon be available.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
              Currently exclusive to Super Users for testing and feedback.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/alphalens-labs')}
            className="w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to AlphaLens Labs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
