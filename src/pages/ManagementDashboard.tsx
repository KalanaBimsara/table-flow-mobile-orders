import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, CheckCircle2, Clock, Package2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Order, OrderStatus } from '@/types/order';
import { format } from 'date-fns';

type OrderResponse = {
  id: string;
  customer_name: string;
  address: string;
  contact_number: string;
  table_size: string;
  colour: string;
  quantity: number;
  price: number;
  note: string | null;
  status: string;
  delivery_status: string;
  created_at: string;
  completed_at: string | null;
  delivery_person_id: string | null;
  sales_person_name: string | null;
};

type OrderTableResponse = {
  id: string;
  order_id: string;
  size: string;
  colour: string;
  top_colour: string | null;
  frame_colour: string | null;
  quantity: number;
  price: number;
};

const ManagementDashboard: React.FC = () => {
  const { userRole } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'manager' || userRole === 'admin') {
      fetchOrders();
    }
  }, [userRole]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch pending orders with delivery_status = 'pending'
      const { data: pendingOrdersData, error: pendingError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .eq('delivery_status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('Error fetching pending orders:', pendingError);
        toast({ title: 'Error', description: 'Failed to fetch pending orders', variant: 'destructive' });
        return;
      }

      // Fetch orders ready for delivery
      const { data: readyOrdersData, error: readyError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .eq('delivery_status', 'ready_for_delivery')
        .order('created_at', { ascending: false });

      if (readyError) {
        console.error('Error fetching ready orders:', readyError);
        toast({ title: 'Error', description: 'Failed to fetch ready orders', variant: 'destructive' });
        return;
      }

      const allOrdersData = [...(pendingOrdersData || []), ...(readyOrdersData || [])];
      
      if (allOrdersData.length === 0) {
        setPendingOrders([]);
        setReadyOrders([]);
        return;
      }

      // Extract order IDs to fetch related table data
      const orderIds = allOrdersData.map(order => order.id);

      // Fetch the order_tables data for these orders
      const { data: tablesData, error: tablesError } = await supabase
        .from('order_tables')
        .select('*')
        .in('order_id', orderIds);

      if (tablesError) {
        console.error('Error fetching order tables:', tablesError);
        toast({ title: 'Error', description: 'Failed to fetch table details', variant: 'destructive' });
        return;
      }

      // Group tables by order_id
      const tablesByOrder = (tablesData || []).reduce((acc, table) => {
        if (!acc[table.order_id]) {
          acc[table.order_id] = [];
        }
        acc[table.order_id].push({
          id: table.id,
          size: table.size,
          colour: table.colour,
          topColour: table.top_colour || table.colour,
          frameColour: table.frame_colour || table.colour,
          quantity: table.quantity,
          price: table.price
        });
        return acc;
      }, {} as Record<string, any[]>);

      // Transform the data to match the Order type structure
      const transformedOrders = allOrdersData.map((order: OrderResponse) => ({
        id: order.id,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: tablesByOrder[order.id] || [{
          id: order.id,
          size: order.table_size,
          colour: order.colour,
          topColour: order.colour,
          frameColour: order.colour,
          quantity: order.quantity,
          price: order.price / order.quantity
        }],
        note: order.note,
        status: order.status as OrderStatus,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: order.price,
        assignedTo: order.delivery_person_id,
        salesPersonName: order.sales_person_name,
        deliveryStatus: order.delivery_status
      }));

      // Separate pending and ready orders
      const pending = transformedOrders.filter(order => order.deliveryStatus === 'pending');
      const ready = transformedOrders.filter(order => order.deliveryStatus === 'ready_for_delivery');

      setPendingOrders(pending);
      setReadyOrders(ready);
    } catch (error) {
      console.error('Error processing orders:', error);
      toast({ title: 'Error', description: 'An error occurred while fetching orders', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const markAsReadyForDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: 'ready_for_delivery' })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order:', error);
        toast({ title: 'Error', description: 'Failed to mark order as ready for delivery', variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: 'Order marked as ready for delivery!', variant: 'default' });
      
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Error processing order update:', error);
      toast({ title: 'Error', description: 'An error occurred while updating the order', variant: 'destructive' });
    }
  };

  const markAsPending = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: 'pending' })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order:', error);
        toast({ title: 'Error', description: 'Failed to mark order as pending', variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: 'Order marked as pending', variant: 'default' });
      
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Error processing order update:', error);
      toast({ title: 'Error', description: 'An error occurred while updating the order', variant: 'destructive' });
    }
  };

  if (userRole !== 'manager' && userRole !== 'admin') {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Access denied. Only managers and administrators can access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings size={32} />
            Management Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage order production and delivery workflow
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            <Users size={14} className="mr-1" />
            {userRole === 'manager' ? 'Manager' : 'Administrator'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} className="text-orange-500" />
              Pending Orders ({pendingOrders.length})
            </CardTitle>
            <CardDescription>
              Orders waiting to be marked as ready for delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-muted h-32 rounded-lg" />
                ))}
              </div>
            ) : pendingOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No pending orders at the moment
              </p>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{order.customerName}</h3>
                        <p className="text-sm text-muted-foreground">{order.address}</p>
                        <p className="text-sm text-muted-foreground">{order.contactNumber}</p>
                      </div>
                      <Badge variant="secondary">
                        ₹{order.totalPrice.toLocaleString()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {order.tables.map((table, index) => (
                        <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                          <span className="font-medium">{table.size}</span> - {table.quantity}x
                          <span className="ml-2 text-muted-foreground">
                            Top: {table.topColour}, Frame: {table.frameColour}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {order.note && (
                      <div className="text-sm">
                        <strong>Note:</strong> {order.note}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Created: {format(order.createdAt, 'PPp')}</span>
                      {order.salesPersonName && (
                        <span>Sales: {order.salesPersonName}</span>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <Button 
                      onClick={() => markAsReadyForDelivery(order.id)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 size={16} className="mr-2" />
                      Mark as Ready for Delivery
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ready for Delivery Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package2 size={20} className="text-green-500" />
              Ready for Delivery ({readyOrders.length})
            </CardTitle>
            <CardDescription>
              Orders ready to be assigned to delivery personnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-muted h-32 rounded-lg" />
                ))}
              </div>
            ) : readyOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No orders ready for delivery
              </p>
            ) : (
              <div className="space-y-4">
                {readyOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 space-y-3 bg-green-50 dark:bg-green-950/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {order.customerName}
                          <Badge variant="default" className="bg-green-600">
                            Ready
                          </Badge>
                        </h3>
                        <p className="text-sm text-muted-foreground">{order.address}</p>
                        <p className="text-sm text-muted-foreground">{order.contactNumber}</p>
                      </div>
                      <Badge variant="secondary">
                        ₹{order.totalPrice.toLocaleString()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {order.tables.map((table, index) => (
                        <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                          <span className="font-medium">{table.size}</span> - {table.quantity}x
                          <span className="ml-2 text-muted-foreground">
                            Top: {table.topColour}, Frame: {table.frameColour}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {order.note && (
                      <div className="text-sm">
                        <strong>Note:</strong> {order.note}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Created: {format(order.createdAt, 'PPp')}</span>
                      {order.salesPersonName && (
                        <span>Sales: {order.salesPersonName}</span>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <Button 
                      onClick={() => markAsPending(order.id)}
                      variant="outline"
                      className="w-full"
                    >
                      Mark as Pending
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagementDashboard;