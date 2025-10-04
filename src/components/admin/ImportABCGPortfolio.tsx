import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ImportABCGPortfolio() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Read CSV file
      const csvContent = await file.text();

      // Call edge function
      const { data, error } = await supabase.functions.invoke('import-abcg-portfolio', {
        body: { csvContent, userId: user.id },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: 'Import successful',
        description: `Imported ${data.positionsImported} positions (${data.rowsSkipped} rows skipped)`,
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Import ABCG Research Portfolio</h3>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={importing}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload">
            <Button asChild disabled={importing}>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'Importing...' : 'Upload CSV'}
              </span>
            </Button>
          </label>
        </div>

        {result && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Import completed successfully</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Positions imported: {result.positionsImported}</p>
              <p>• Rows skipped: {result.rowsSkipped}</p>
              <p>• Total portfolio value: ${result.totalValue?.toFixed(2)}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/pnl-calculator')}
              className="mt-2"
            >
              View in PNL Calculator
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
