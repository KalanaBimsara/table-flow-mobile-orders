
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import OrderCard from './OrderCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

export function OrderList() {
  const { getFilteredOrders, orders, assignOrder } = useApp();
  const { userRole, user } = useAuth();
  const isMobile = useIsMobile();

  const pendingOrders = getFilteredOrders('pending');
  const assignedOrders = getFilteredOrders('assigned');
  const completedOrders = getFilteredOrders('completed');
  
  // Filter assigned orders to only show those assigned to the current user
  const myAssignedOrders = assignedOrders.filter(order => 
    order.assignedTo === user?.id
  );
  
  // Handle self-assignment of orders
  const handleSelfAssign = (orderId: string) => {
    if (!user) return;
    assignOrder(orderId, user.id);
  };

  // For delivery users, show available pending orders and their assigned orders
  if (userRole === 'delivery') {
    return (
      <Card className="w-full">
        <CardHeader className="text-center md:text-left">
          <CardTitle className="flex items-center justify-center md:justify-start gap-3 text-2xl md:text-3xl">
            <Truck size={isMobile ? 24 : 32} />
            Delivery Dashboard
          </CardTitle>
          <CardDescription className="text-base md:text-lg">
            Manage your deliveries and take new orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="my-deliveries" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="my-deliveries" className="px-2 py-2">
                <span className="flex flex-col items-center">
                  <Truck size={isMobile ? 16 : 18} />
                  <span className="mt-1 text-xs">My Deliveries</span>
                  <span className="text-xs opacity-80">({myAssignedOrders.length})</span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="available" className="px-2 py-2">
                <span className="flex flex-col items-center">
                  <Package size={isMobile ? 16 : 18} />
                  <span className="mt-1 text-xs">Available</span>
                  <span className="text-xs opacity-80">({pendingOrders.length})</span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="px-2 py-2">
                <span className="flex flex-col items-center">
                  <CheckCircle2 size={isMobile ? 16 : 18} />
                  <span className="mt-1 text-xs">Completed</span>
                  <span className="text-xs opacity-80">({completedOrders.length})</span>
                </span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="my-deliveries" className="space-y-4">
              {myAssignedOrders.length > 0 ? (
                myAssignedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <p className="text-center py-10 text-muted-foreground">
                  You haven't been assigned any deliveries yet.
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="available" className="space-y-4">
              {pendingOrders.length > 0 ? (
                pendingOrders.map(order => (
                  <div key={order.id} className="relative">
                    <OrderCard order={order} />
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={() => handleSelfAssign(order.id)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Assign to me
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-10 text-muted-foreground">
                  No orders available for delivery at the moment.
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              {completedOrders.filter(order => order.assignedTo === user?.id).length > 0 ? (
                completedOrders
                  .filter(order => order.assignedTo === user?.id)
                  .map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))
              ) : (
                <p className="text-center py-10 text-muted-foreground">
                  You haven't completed any deliveries yet.
                </p>
              )}
            </TabsContent>
          </Tabs>
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
