import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Beaker, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

export default function ComingSoon() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const toolName = searchParams.get('tool') || 'This Feature';
  const description = searchParams.get('description') || 'This feature is currently under development.';

  return (
    <Layout>
      <div className="container-wrapper min-h-screen flex items-center justify-center py-8 px-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl">
                <Beaker className="h-12 w-12 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <Badge variant="secondary" className="mb-2">
                🧠 AI-Powered
              </Badge>
              <CardTitle className="text-2xl sm:text-3xl font-bold">
                {toolName}
              </CardTitle>
              <CardDescription className="text-base">
                {description}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">Currently Under Development</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our team is actively working on this feature. It will be available soon in AlphaLens Labs. 
                Stay tuned for updates and new AI-powered tools to enhance your market intelligence.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
              <Button 
                onClick={() => navigate('/alphalens-labs')}
                className="w-full sm:flex-1 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to AlphaLens Labs
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:flex-1"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
