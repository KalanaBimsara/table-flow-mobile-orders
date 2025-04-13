
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import OrderCard from './OrderCard';
import { OrderStatus } from '@/types/order';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, CheckCircle2, ShoppingBag } from 'lucide-react';

export function OrderList() {
  const { getFilteredOrders, userRole } = useApp();

  const pendingOrders = getFilteredOrders('pending');
  const assignedOrders = getFilteredOrders('assigned');
  const completedOrders = getFilteredOrders('completed');

  // For delivery users, only show assigned orders
  if (userRole === 'delivery') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck size={20} />
            Your Assigned Deliveries
          </CardTitle>
          <CardDescription>
            Orders assigned to you for delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignedOrders.length > 0 ? (
              assignedOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Package size={16} />
                <span className="hidden sm:inline">All Orders</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Truck size={16} />
                <span className="hidden sm:inline">Active</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span className="hidden sm:inline">Completed</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <div className="space-y-4">
                {pendingOrders.length > 0 || assignedOrders.length > 0 || completedOrders.length > 0 ? (
                  [...pendingOrders, ...assignedOrders, ...completedOrders].map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
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
                  <p className="text-center py-8 text-muted-foreground">
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
                  <p className="text-center py-8 text-muted-foreground">
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
      <CardHeader>
        <CardTitle>Manage Orders</CardTitle>
        <CardDescription>
          View and manage all furniture table orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Package size={16} />
              <span className="hidden sm:inline">Pending</span>
              <span className="inline sm:hidden">({pendingOrders.length})</span>
              <span className="hidden sm:inline">({pendingOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex items-center gap-2">
              <Truck size={16} />
              <span className="hidden sm:inline">Assigned</span>
              <span className="inline sm:hidden">({assignedOrders.length})</span>
              <span className="hidden sm:inline">({assignedOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span className="hidden sm:inline">Completed</span>
              <span className="inline sm:hidden">({completedOrders.length})</span>
              <span className="hidden sm:inline">({completedOrders.length})</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-4">
            <div className="space-y-4">
              {pendingOrders.length > 0 ? (
                pendingOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground">
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
                <p className="text-center py-8 text-muted-foreground">
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
                <p className="text-center py-8 text-muted-foreground">
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
