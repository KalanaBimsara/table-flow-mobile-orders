
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import OrderCard from './OrderCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

export function OrderList() {
  const { getFilteredOrders, orders } = useApp();
  const { userRole } = useAuth();
  const isMobile = useIsMobile();

  const pendingOrders = getFilteredOrders('pending');
  const assignedOrders = getFilteredOrders('assigned');
  const completedOrders = getFilteredOrders('completed');

  // For delivery users, show all assigned orders with larger, clearer view
  if (userRole === 'delivery') {
    return (
      <Card className="w-full">
        <CardHeader className="text-center md:text-left">
          <CardTitle className="flex items-center justify-center md:justify-start gap-3 text-2xl md:text-3xl">
            <Truck size={isMobile ? 24 : 32} />
            Your Deliveries
          </CardTitle>
          <CardDescription className="text-base md:text-lg">
            Orders assigned to you for delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {assignedOrders.length > 0 ? (
              assignedOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <p className="text-center py-10 text-xl md:text-2xl text-muted-foreground">
                No deliveries assigned to you yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // For customer users, show their orders
  if (userRole === 'customer') {
    return (
      <Card className="w-full">
        <CardHeader className={isMobile ? "text-center" : ""}>
          <CardTitle className={`flex items-center ${isMobile ? "justify-center" : ""} gap-2`}>
            <ShoppingBag size={20} />
            Your Orders
          </CardTitle>
          <CardDescription>
            Track your furniture table orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="flex items-center justify-center gap-2 text-xs md:text-base">
                <Package size={isMobile ? 14 : 16} />
                <span>All</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center justify-center gap-2 text-xs md:text-base">
                <Truck size={isMobile ? 14 : 16} />
                <span>Active</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center justify-center gap-2 text-xs md:text-base">
                <CheckCircle2 size={isMobile ? 14 : 16} />
                <span>Completed</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <div className="space-y-4">
                {pendingOrders.length > 0 || assignedOrders.length > 0 || completedOrders.length > 0 ? (
                  [...pendingOrders, ...assignedOrders, ...completedOrders].map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground text-lg">
                    You haven't placed any orders yet.
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="active" className="mt-4">
              <div className="space-y-4">
                {pendingOrders.length > 0 || assignedOrders.length > 0 ? (
                  [...pendingOrders, ...assignedOrders].map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground text-lg">
                    No active orders found.
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="completed" className="mt-4">
              <div className="space-y-4">
                {completedOrders.length > 0 ? (
                  completedOrders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground text-lg">
                    No completed orders found.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // For admin users, show all orders with tabs
  return (
    <Card className="w-full">
      <CardHeader className={isMobile ? "text-center" : ""}>
        <CardTitle className={`${isMobile ? "text-center" : ""}`}>Manage Orders</CardTitle>
        <CardDescription>
          View and manage all furniture table orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 text-xs md:text-base">
              <Package size={isMobile ? 14 : 16} />
              <span>Pending</span>
              <span className="text-xs">({pendingOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 text-xs md:text-base">
              <Truck size={isMobile ? 14 : 16} />
              <span>Assigned</span>
              <span className="text-xs">({assignedOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 text-xs md:text-base">
              <CheckCircle2 size={isMobile ? 14 : 16} />
              <span>Completed</span>
              <span className="text-xs">({completedOrders.length})</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-4">
            <div className="space-y-4">
              {pendingOrders.length > 0 ? (
                pendingOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground text-lg">
                  No pending orders found.
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="assigned" className="mt-4">
            <div className="space-y-4">
              {assignedOrders.length > 0 ? (
                assignedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground text-lg">
                  No assigned orders found.
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="completed" className="mt-4">
            <div className="space-y-4">
              {completedOrders.length > 0 ? (
                completedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground text-lg">
                  No completed orders found.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default OrderList;
