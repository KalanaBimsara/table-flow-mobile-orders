import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Settings, Package, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Order } from '@/types/order';
import { format } from 'date-fns';

const ManagementDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]); // production / pending list
  const [awaitingApprovalOrders, setAwaitingApprovalOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // load both lists
    fetchPendingOrders();
    fetchAwaitingApprovalOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAwaitingApprovalOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_tables(*)')
        .eq('status', 'awaiting_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders = data?.map((order: any) => ({
        id: order.id,
        orderFormNumber: order.order_form_number || 'N/A',
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: order.order_tables?.map((table: any) => ({
          id: table.id,
          size: table.size,
          topColour: table.top_colour || '',
          frameColour: table.frame_colour || '',
          colour: table.colour,
          quantity: table.quantity,
          price: Number(table.price)
        })) || [],
        note: order.note,
        status: order.status as any,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: Number(order.price),
        deliveryFee: order.delivery_fee ? Number(order.delivery_fee) : undefined,
        additionalCharges: order.additional_charges ? Number(order.additional_charges) : undefined,
        assignedTo: order.delivery_person_id,
        delivery_person_id: order.delivery_person_id,
        createdBy: order.created_by,
        salesPersonName: order.sales_person_name,
        deliveryStatus: (order.delivery_status || 'pending') as 'pending' | 'ready'
      })) || [];

      setAwaitingApprovalOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching awaiting approval orders:', error);
      toast.error('Failed to fetch awaiting approval orders');
    } finally {
      setLoading(false);
    }
  };

  const markAwaitingOrderReady = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: 'ready' })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order marked as ready for delivery');
      await fetchAwaitingApprovalOrders();
      await fetchPendingOrders(); // refresh pending/production list too
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_tables(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders = data?.map((order: any) => ({
        id: order.id,
        orderFormNumber: order.order_form_number || 'N/A',
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: order.order_tables?.map((table: any) => ({
          id: table.id,
          size: table.size,
          topColour: table.top_colour || '',
          frameColour: table.frame_colour || '',
          colour: table.colour,
          quantity: table.quantity,
          price: Number(table.price)
        })) || [],
        note: order.note,
        status: order.status as any,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        totalPrice: Number(order.price),
        deliveryFee: order.delivery_fee ? Number(order.delivery_fee) : undefined,
        additionalCharges: order.additional_charges ? Number(order.additional_charges) : undefined,
        assignedTo: order.delivery_person_id,
        delivery_person_id: order.delivery_person_id,
        createdBy: order.created_by,
        salesPersonName: order.sales_person_name,
        deliveryStatus: (order.delivery_status || 'pending') as 'pending' | 'ready'
      })) || [];

      // If your scheme uses deliveryStatus to move between lists, split them:
      const awaitingApproval = formattedOrders.filter((o) => o.deliveryStatus === 'pending');
      const productionOrders = formattedOrders.filter((o) => o.deliveryStatus === 'ready');

      // For backward compatibility, we'll show both: append to state
      // (you already fetch awaiting approval separately too; this keeps behavior consistent)
      setAwaitingApprovalOrders((prev) => {
        // merge but avoid duplicates by id
        const map = new Map(prev.map(p => [p.id, p]));
        awaitingApproval.forEach(a => map.set(a.id, a));
        return Array.from(map.values());
      });

      setOrders((prev) => {
        // merge but avoid duplicates by id
        const map = new Map(prev.map(p => [p.id, p]));
        productionOrders.forEach(p => map.set(p.id, p));
        // if there were previously items with deliveryStatus 'pending' in orders state, they may remain; replace whole state with the merged list
        return Array.from(map.values());
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const markAsReadyForDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: 'ready' })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order marked as ready for delivery');
      await fetchPendingOrders();
      await fetchAwaitingApprovalOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  // ---- Filtering (computed values) ----
  const lowerSearch = searchTerm.trim().toLowerCase();

  const filteredAwaitingApproval = awaitingApprovalOrders.filter((order) => {
    if (!lowerSearch) return true;
    const matchesCustomer = order.customerName?.toLowerCase().includes(lowerSearch);
    const matchesForm = order.orderFormNumber?.toLowerCase().includes(lowerSearch);
    const matchesSales = order.salesPersonName?.toLowerCase().includes(lowerSearch);
    return Boolean(matchesCustomer || matchesForm || matchesSales);
  });

  const filteredPendingOrders = orders.filter((order) => {
    if (!lowerSearch) return true;
    const matchesCustomer = order.customerName?.toLowerCase().includes(lowerSearch);
    const matchesForm = order.orderFormNumber?.toLowerCase().includes(lowerSearch);
    const matchesSales = order.salesPersonName?.toLowerCase().includes(lowerSearch);
    return Boolean(matchesCustomer || matchesForm || matchesSales);
  });

  if (loading) {
    return (
      <div className="container py-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Search Card */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Search Orders</h2>
            <p className="text-sm text-muted-foreground">
              Search by customer name, order form number, or salesperson
            </p>
          </div>
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={20} />
            Management Dashboard
          </CardTitle>
          <CardDescription>
            Manage production orders and mark them as ready for delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Total pending orders in production: {orders.length}
          </div>
        </CardContent>
      </Card>

      {/* Production Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package size={20} />
            Production Status
          </CardTitle>
          <CardDescription>
            Orders completed by production and ready to be assembled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredAwaitingApproval.length === 0 && lowerSearch ? (
            <p className="text-muted-foreground text-center py-4">
              No results found for “{searchTerm}”
            </p>
          ) : filteredAwaitingApproval.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No orders awaiting approval
            </p>
          ) : (
            filteredAwaitingApproval.map((order) => (
              <Card key={order.id} className="p-4 border border-dashed">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">
                      {order.customerName} ({order.salesPersonName})
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Order Form: {order.orderFormNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.createdAt ? format(order.createdAt, "PPP") : ''}
                    </p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Awaiting approval list (detailed cards) */}
      <div className="grid gap-4">
        {awaitingApprovalOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No orders awaiting assembly approval
            </CardContent>
          </Card>
        ) : (
          awaitingApprovalOrders.map((order) => (
            <Card
              key={order.id}
              className="transition-all duration-300 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package size={18} />
                      Order #{order.id.slice(-8)}
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1">
                        <Package size={12} />
                        Ready to be Assembled
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Customer: {order.customerName} • Created: {order.createdAt?.toLocaleDateString()}
                      <span className="font-medium"> • Sales Person: </span> {order.salesPersonName || 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(`/order-form/${order.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      <FileText size={16} className="mr-2" />
                      Order Form
                    </Button>
                    <Button
                      onClick={() => markAwaitingOrderReady(order.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <CheckCircle2 size={16} className="mr-2" />
                      Mark Ready for Delivery
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Customer Details</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">Address:</span> {order.address}</p>
                      <p><span className="font-medium">Contact:</span> {order.contactNumber}</p>
                      {order.note && <p><span className="font-medium">Note:</span> {order.note}</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Order Summary</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">Total Items:</span> {order.tables.length}</p>
                      <p><span className="font-medium">Total Price:</span> LKR {order.totalPrice?.toLocaleString()}</p>
                      {order.deliveryFee && (
                        <p><span className="font-medium">Delivery Fee:</span> LKR {order.deliveryFee.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>

                {order.tables.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Items</h4>
                    <div className="space-y-2">
                      {order.tables.map((table: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-background rounded border text-sm">
                          <div>
                            <span className="font-medium">{table.size}</span>
                            <span className="text-muted-foreground ml-2">
                              {table.top_colour && `Top: ${table.top_colour}`}
                              {table.frame_colour && ` • Frame: ${table.frame_colour}`}
                              {!table.top_colour && !table.frame_colour && `Color: ${table.colour}`}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">Qty: {table.quantity}</span>
                            <span className="text-muted-foreground ml-2">LKR {Number(table.price).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pending Orders Section (production / pending) */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Orders in Production</CardTitle>
          <CardDescription>
            Orders currently being processed by production team
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No pending orders in production
            </CardContent>
          </Card>
        ) : (
          filteredPendingOrders.map((order) => (
            <Card
              key={order.id}
              className={`transition-all duration-300 ${
                order.deliveryStatus === 'ready'
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                  : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
              }`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package size={18} />
                      Order # {order.orderFormNumber}
                      {order.deliveryStatus === 'ready' && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Ready for Delivery
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Customer: {order.customerName} • Created: {order.createdAt?.toLocaleDateString()}
                      <span className="font-medium"> • Sales Person: </span> {order.salesPersonName || 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(`/order-form/${order.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      <FileText size={16} className="mr-2" />
                      Order Form
                    </Button>
                    {order.deliveryStatus === 'pending' && (
                      <Button
                        onClick={() => markAsReadyForDelivery(order.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <CheckCircle2 size={16} className="mr-2" />
                        Mark Ready for Delivery
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Customer Details</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">Address:</span> {order.address}</p>
                      <p><span className="font-medium">Contact:</span> {order.contactNumber}</p>
                      {order.note && <p><span className="font-medium">Note:</span> {order.note}</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Order Summary</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">Total Items:</span> {order.tables.length}</p>
                      <p><span className="font-medium">Total Price:</span> LKR {order.totalPrice?.toLocaleString()}</p>
                      {order.deliveryFee && (
                        <p><span className="font-medium">Delivery Fee:</span> LKR {order.deliveryFee.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>

                {order.tables.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Items</h4>
                    <div className="space-y-2">
                      {order.tables.map((table: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-background rounded border text-sm">
                          <div>
                            <span className="font-medium">{table.size}</span>
                            <span className="text-muted-foreground ml-2">
                              {table.top_colour && `Top: ${table.top_colour}`}
                              {table.frame_colour && ` • Frame: ${table.frame_colour}`}
                              {!table.top_colour && !table.frame_colour && `Color: ${table.colour}`}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">Qty: {table.quantity}</span>
                            <span className="text-muted-foreground ml-2">LKR {Number(table.price).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ManagementDashboard;
