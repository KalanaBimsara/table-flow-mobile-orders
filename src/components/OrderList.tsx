
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
            <TabsList className="grid w-full grid-cols-3 mobile-tabs-container">
              <TabsTrigger value="all" className="mobile-tab-item">
                <Package size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">All</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="mobile-tab-item">
                <Truck size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">Active</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="mobile-tab-item">
                <CheckCircle2 size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">Completed</span>
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
          <TabsList className="grid w-full grid-cols-3 gap-1">
            <TabsTrigger value="pending" className="flex flex-col items-center justify-center py-2">
              <Package size={isMobile ? 14 : 16} />
              <span className="tab-text text-xs">Pending</span>
              <span className="mobile-tab-count">({pendingOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex flex-col items-center justify-center py-2">
              <Truck size={isMobile ? 14 : 16} />
              <span className="tab-text text-xs">Assigned</span>
              <span className="mobile-tab-count">({assignedOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex flex-col items-center justify-center py-2">
              <CheckCircle2 size={isMobile ? 14 : 16} />
              <span className="tab-text text-xs">Completed</span>
              <span className="mobile-tab-count">({completedOrders.length})</span>
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
