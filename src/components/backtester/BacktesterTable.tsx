import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BacktestTradeSetup } from '@/data/mockBacktesterData';
import { ArrowUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface BacktesterTableProps {
  trades: BacktestTradeSetup[];
}

type SortField = 'date' | 'instrument' | 'pnl_percent' | 'confidence';
type FilterType = 'all' | 'winning' | 'losing';

export function BacktesterTable({ trades }: BacktesterTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let filtered = [...trades];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(trade =>
        trade.instrument.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterType === 'winning') {
      filtered = filtered.filter(t => t.status === 'TP Hit');
    } else if (filterType === 'losing') {
      filtered = filtered.filter(t => t.status === 'SL Hit');
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'instrument':
          comparison = a.instrument.localeCompare(b.instrument);
          break;
        case 'pnl_percent':
          comparison = a.pnl_percent - b.pnl_percent;
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
      }

      return sortAsc ? comparison : -comparison;
    });

    return filtered;
  }, [trades, searchTerm, filterType, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const paginatedTrades = filteredTrades.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '600ms' }}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Trade Setup Details</CardTitle>
            <CardDescription>
              Detailed results for {filteredTrades.length} trade{filteredTrades.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search instrument..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
          >
            All Trades
          </Button>
          <Button
            size="sm"
            variant={filterType === 'winning' ? 'default' : 'outline'}
            onClick={() => setFilterType('winning')}
          >
            Winning Only
          </Button>
          <Button
            size="sm"
            variant={filterType === 'losing' ? 'default' : 'outline'}
            onClick={() => setFilterType('losing')}
          >
            Losing Only
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {paginatedTrades.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No trade setups found yet. Try generating setups first in AlphaLens AI.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('date')}>
                        Date <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('instrument')}>
                        Instrument <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">TP</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('pnl_percent')}>
                        PnL (%) <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('confidence')}>
                        Confidence <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">
                        {new Date(trade.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>{trade.instrument}</TableCell>
                      <TableCell>
                        <Badge variant={trade.direction === 'Long' ? 'default' : 'secondary'}>
                          {trade.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{trade.entry.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{trade.tp.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{trade.sl.toFixed(4)}</TableCell>
                      <TableCell>
                        <Badge variant={trade.status === 'TP Hit' ? 'default' : 'destructive'} className={trade.status === 'TP Hit' ? 'bg-success text-success-foreground' : ''}>
                          {trade.status === 'TP Hit' ? '✅ TP Hit' : '❌ SL Hit'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        trade.pnl_percent >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {trade.pnl_percent >= 0 ? '+' : ''}{trade.pnl_percent.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{trade.confidence}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredTrades.length)} of{' '}
                  {filteredTrades.length} trades
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
