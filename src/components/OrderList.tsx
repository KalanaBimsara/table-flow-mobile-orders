
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import OrderCard from './OrderCard';
import { OrderStatus } from '@/types/order';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, CheckCircle2 } from 'lucide-react';

export function OrderList() {
  const { getFilteredOrders, loading } = useApp();
  const { profile } = useAuth();

  const pendingOrders = getFilteredOrders('pending');
  const assignedOrders = getFilteredOrders('assigned');
  const completedOrders = getFilteredOrders('completed');

  // For delivery users, only show assigned orders
  if (profile?.role === 'delivery') {
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
          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    );
  }

  // For customer users, show only their orders
  if (profile?.role === 'customer') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
          <CardDescription>
            Track the status of your table orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : (
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
                  <span className="hidden sm:inline">In Progress</span>
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
                      No in-progress orders found.
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
          )}
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
        {loading ? (
          <div className="text-center py-8">Loading orders...</div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

export default OrderList;
