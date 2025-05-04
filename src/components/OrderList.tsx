
import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import OrderCard from './OrderCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order, OrderStatus } from '@/types/order';

export function OrderList() {
  const { getFilteredOrders, orders, assignOrder, completeOrder } = useApp();
  const { userRole, user } = useAuth();
  const isMobile = useIsMobile();

  const pendingOrders = getFilteredOrders('pending');
  const assignedOrders = getFilteredOrders('assigned');
  const completedOrders = getFilteredOrders('completed');
  
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);

  React.useEffect(() => {
    if (userRole === 'delivery') {
      fetchAvailableOrders();
    }
  }, [userRole]);

  const fetchAvailableOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching available orders:', error);
        toast.error('Failed to fetch available orders');
        return;
      }

      // Transform the data to match the Order type structure with the new properties
      const formattedOrders = data.map(order => ({
        id: order.id,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: [{
          id: order.id,
          size: order.table_size,
          colour: order.colour,
          topColour: order.colour, // Use the same color for both topColour and frameColour as fallback
          frameColour: order.colour, // Use the same color for both topColour and frameColour as fallback
          quantity: order.quantity,
          price: order.price / order.quantity
        }],
        note: order.note,
        status: order.status as OrderStatus,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: order.price,
        assignedTo: order.delivery_person_id
      }));

      setAvailableOrders(formattedOrders);
    } catch (error) {
      console.error('Error processing available orders:', error);
      toast.error('An error occurred while fetching orders');
    }
  };

  const handleSelfAssign = async (orderId: string) => {
    if (!user) {
      toast.error('You must be logged in to assign orders');
      return;
    }
    
    try {
      await assignOrder(orderId, user.id);
      toast.success('Order assigned to you successfully');
      fetchAvailableOrders(); // Refresh available orders
    } catch (error) {
      console.error('Error assigning order:', error);
      toast.error('Failed to assign order');
    }
  };

  // For delivery users, show assigned orders and available orders
  if (userRole === 'delivery') {
    return (
      <Card className="w-full">
        <CardHeader className="text-center md:text-left">
          <CardTitle className="flex items-center justify-center md:justify-start gap-3 text-2xl md:text-3xl">
            <Truck size={isMobile ? 24 : 32} />
            Delivery Dashboard
          </CardTitle>
          <CardDescription className="text-base md:text-lg">
            Manage your delivery assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="myDeliveries">
            <TabsList className="grid w-full grid-cols-3 mobile-tabs-container">
              <TabsTrigger value="myDeliveries" className="mobile-tab-item">
                <Truck size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">My Deliveries</span>
              </TabsTrigger>
              <TabsTrigger value="available" className="mobile-tab-item">
                <Package size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">Available</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="mobile-tab-item">
                <CheckCircle2 size={isMobile ? 14 : 16} />
                <span className="mobile-tab-label">Completed</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="myDeliveries" className="mt-4">
              <div className="space-y-6">
                {assignedOrders.length > 0 ? (
                  assignedOrders.filter(order => order.assignedTo === user?.id).map(order => (
                    <OrderCard 
                      key={order.id} 
                      order={order}
                      onComplete={() => completeOrder(order.id)}
                    />
                  ))
                ) : (
                  <p className="text-center py-10 text-xl md:text-2xl text-muted-foreground">
                    No deliveries assigned to you yet.
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="available" className="mt-4">
              <div className="space-y-6">
                {availableOrders.length > 0 ? (
                  availableOrders.map(order => (
                    <div key={order.id} className="relative">
                      <OrderCard 
                        key={order.id} 
                        order={order}
                        actionButton={
                          <button 
                            onClick={() => handleSelfAssign(order.id)}
                            className="w-full md:w-auto px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                          >
                            Assign to Me
                          </button>
                        }
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-center py-10 text-xl md:text-2xl text-muted-foreground">
                    No available orders to deliver.
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="completed" className="mt-4">
              <div className="space-y-6">
                {completedOrders.filter(order => order.assignedTo === user?.id).length > 0 ? (
                  completedOrders.filter(order => order.assignedTo === user?.id).map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))
                ) : (
                  <p className="text-center py-10 text-xl md:text-2xl text-muted-foreground">
                    No completed deliveries yet.
                  </p>
                )}
              </div>
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
