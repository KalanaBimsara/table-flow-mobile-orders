
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import OrderCard from '@/components/OrderCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

const OrderHistory: React.FC = () => {
  const { getFilteredOrders } = useApp();
  const completedOrders = getFilteredOrders('completed');

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Order History</h1>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 size={20} />
            Completed Orders
          </CardTitle>
          <CardDescription>
            All successfully delivered and completed orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {completedOrders.length > 0 ? (
              completedOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No completed orders yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderHistory;
