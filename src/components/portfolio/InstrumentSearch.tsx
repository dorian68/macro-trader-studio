import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Instrument {
  id: number;
  symbol: string;
  name: string;
  asset_type: string;
  sector: string;
  currency: string;
  exchange: string;
}

interface InstrumentSearchProps {
  onSelect: (instrument: Instrument) => void;
}

export default function InstrumentSearch({ onSelect }: InstrumentSearchProps) {
  const [query, setQuery] = useState('');
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (query.length > 1) {
      searchInstruments();
    } else {
      setInstruments([]);
      setShowResults(false);
    }
  }, [query]);

  const searchInstruments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('*')
        .or(`symbol.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setInstruments(data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching instruments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (instrument: Instrument) => {
    onSelect(instrument);
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an asset (symbol or name)..."
          className="pl-10"
          onFocus={() => query.length > 1 && setShowResults(true)}
        />
      </div>

      {showResults && (
        <Card className="absolute top-full left-0 right-0 z-[9999] mt-1 max-h-80 overflow-y-auto bg-background border shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Searching...
              </div>
            ) : instruments.length > 0 ? (
              <div className="divide-y">
                {instruments.map((instrument) => (
                  <Button
                    key={instrument.id}
                    variant="ghost"
                    className="w-full justify-start p-4 h-auto"
                    onClick={() => handleSelect(instrument)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <TrendingUp className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{instrument.symbol}</span>
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {instrument.asset_type}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {instrument.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {instrument.sector && <span>{instrument.sector}</span>}
                          {instrument.exchange && <span>• {instrument.exchange}</span>}
                          {instrument.currency && <span>• {instrument.currency}</span>}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No assets found
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}