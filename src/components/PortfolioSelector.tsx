import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase } from 'lucide-react';

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  total_value: number | null;
}

interface PortfolioSelectorProps {
  onSelect: (portfolioId: string | null) => void;
  selectedId: string | null;
}

export default function PortfolioSelector({ onSelect, selectedId }: PortfolioSelectorProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name, description, total_value')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPortfolios(data || []);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Briefcase className="h-5 w-5 text-muted-foreground" />
      <Select
        value={selectedId || 'mock'}
        onValueChange={(value) => onSelect(value === 'mock' ? null : value)}
        disabled={loading}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder={loading ? 'Loading...' : 'Select portfolio'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mock">Mock Portfolio (Demo)</SelectItem>
          {portfolios.map((portfolio) => (
            <SelectItem key={portfolio.id} value={portfolio.id}>
              {portfolio.name}
              {portfolio.total_value !== null && (
                <span className="text-xs text-muted-foreground ml-2">
                  (${portfolio.total_value.toFixed(2)})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
