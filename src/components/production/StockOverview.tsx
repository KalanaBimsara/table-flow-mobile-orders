
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package2, Layers3, Box } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StockItem {
  color: string;
  size: string;
  total_quantity: number;
}

const StockOverview = () => {
  const [tableTopStock, setTableTopStock] = useState<StockItem[]>([]);
  const [barsStock, setBarsStock] = useState<StockItem[]>([]);
  const [legsStock, setLegsStock] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllStock = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch table tops stock
        const { data: tableTopsData, error: tableTopsError } = await supabase
          .from('production_table_tops')
          .select('color, size, quantity')
          .order('color', { ascending: true })
          .order('size', { ascending: true });
        
        if (tableTopsError) throw tableTopsError;
        
        // Fetch bars stock
        const { data: barsData, error: barsError } = await supabase
          .from('production_bars')
          .select('color, size, quantity')
          .order('color', { ascending: true })
          .order('size', { ascending: true });
        
        if (barsError) throw barsError;
        
        // Fetch legs stock
        const { data: legsData, error: legsError } = await supabase
          .from('production_legs')
          .select('color, size, quantity')
          .order('color', { ascending: true })
          .order('size', { ascending: true });
        
        if (legsError) throw legsError;
        
        // Process and aggregate the data
        const tableTopsAggregated = aggregateStockByColorAndSize(tableTopsData || []);
        const barsAggregated = aggregateStockByColorAndSize(barsData || []);
        const legsAggregated = aggregateStockByColorAndSize(legsData || []);
        
        setTableTopStock(tableTopsAggregated);
        setBarsStock(barsAggregated);
        setLegsStock(legsAggregated);
      } catch (err) {
        console.error('Error fetching stock data:', err);
        setError('Failed to load stock data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllStock();
  }, []);

  // Helper function to aggregate stock by color and size
  const aggregateStockByColorAndSize = (items: any[]): StockItem[] => {
    const aggregated: Record<string, StockItem> = {};
    
    items.forEach(item => {
      const key = `${item.color}-${item.size}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          color: item.color,
          size: item.size,
          total_quantity: 0
        };
      }
      aggregated[key].total_quantity += item.quantity;
    });
    
    return Object.values(aggregated);
  };

  const renderStockTable = (items: StockItem[], title: string, icon: React.ReactNode) => {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading stock data...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No {title.toLowerCase()} items in stock.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.color}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell className="text-right font-medium">{item.total_quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Current Inventory Stock</h2>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="tabletops">Table Tops</TabsTrigger>
          <TabsTrigger value="bars">Bars</TabsTrigger>
          <TabsTrigger value="legs">Legs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderStockTable(tableTopStock, "Table Tops", <Layers3 className="h-5 w-5" />)}
            {renderStockTable(barsStock, "Bars", <Package2 className="h-5 w-5" />)}
            {renderStockTable(legsStock, "Legs", <Box className="h-5 w-5" />)}
          </div>
        </TabsContent>
        
        <TabsContent value="tabletops">
          {renderStockTable(tableTopStock, "Table Tops", <Layers3 className="h-5 w-5" />)}
        </TabsContent>
        
        <TabsContent value="bars">
          {renderStockTable(barsStock, "Bars", <Package2 className="h-5 w-5" />)}
        </TabsContent>
        
        <TabsContent value="legs">
          {renderStockTable(legsStock, "Legs", <Box className="h-5 w-5" />)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StockOverview;
