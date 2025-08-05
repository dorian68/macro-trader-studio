import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InstrumentSearch from './InstrumentSearch';

interface Instrument {
  id: number;
  symbol: string;
  name: string;
  asset_type: string;
  sector: string;
  currency: string;
  exchange: string;
}

interface AddPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  onPositionAdded: () => void;
}

export default function AddPositionDialog({
  open,
  onOpenChange,
  portfolioId,
  onPositionAdded,
}: AddPositionDialogProps) {
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedInstrument || !quantity || !averagePrice) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if position already exists
      const { data: existingPosition } = await supabase
        .from('positions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('symbol', selectedInstrument.symbol)
        .single();

      if (existingPosition) {
        // Update existing position
        const newQuantity = parseFloat(existingPosition.quantity.toString()) + parseFloat(quantity);
        const newTotalCost = (parseFloat(existingPosition.quantity.toString()) * parseFloat(existingPosition.average_price.toString())) + 
                            (parseFloat(quantity) * parseFloat(averagePrice));
        const newAveragePrice = newTotalCost / newQuantity;

        const { error } = await supabase
          .from('positions')
          .update({
            quantity: newQuantity,
            average_price: newAveragePrice,
          })
          .eq('id', existingPosition.id);

        if (error) throw error;
      } else {
        // Create new position
        const { error } = await supabase
          .from('positions')
          .insert([
            {
              portfolio_id: portfolioId,
              symbol: selectedInstrument.symbol,
              quantity: parseFloat(quantity),
              average_price: parseFloat(averagePrice),
            }
          ]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Position added successfully",
      });

      // Reset form
      setSelectedInstrument(null);
      setQuantity('');
      setAveragePrice('');
      onOpenChange(false);
      onPositionAdded();
    } catch (error) {
      console.error('Error adding position:', error);
      toast({
        title: "Error",
        description: "Failed to add position",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border shadow-lg z-[9999]">
        <DialogHeader>
          <DialogTitle>Add Position</DialogTitle>
          <DialogDescription>
            Search for an asset and define your position
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Asset</Label>
            {selectedInstrument ? (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedInstrument.symbol}</p>
                    <p className="text-sm text-muted-foreground">{selectedInstrument.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedInstrument(null)}
                  >
                    Change
                  </Button>
                </div>
              </div>
            ) : (
              <InstrumentSearch onSelect={setSelectedInstrument} />
            )}
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.0001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 100"
            />
          </div>

          <div>
            <Label htmlFor="price">Average Purchase Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={averagePrice}
              onChange={(e) => setAveragePrice(e.target.value)}
              placeholder="e.g., 150.25"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Position"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}