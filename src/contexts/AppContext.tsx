
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, OrderStatus, TableItem } from '@/types/order';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AppContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  assignOrder: (orderId: string, assignedTo: string) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
  getFilteredOrders: (status?: OrderStatus) => Order[];
  getAssignedOrders: () => Order[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { user, userRole } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, [user, userRole]);

  const fetchOrders = async () => {
    if (!user) {
      console.log("No user is authenticated, skipping order fetch");
      return;
    }

    try {
      console.log("Fetching orders with user role:", userRole);
      
      let query = supabase.from('orders').select('*');
      
      if (userRole === 'customer') {
        query = query.eq('created_by', user.id);
      } else if (userRole === 'delivery') {
        // Fix: Use delivery_person_id instead of assignedTo
        query = query.eq('delivery_person_id', user.id);
      }
      
      const { data: ordersData, error: ordersError } = await query;
      
      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        toast.error(`Failed to fetch orders: ${ordersError.message}`);
        return;
      }
      
      if (!ordersData || ordersData.length === 0) {
        console.log("No orders returned from query");
        setOrders([]);
        return;
      }
      
      console.log("Fetched orders:", ordersData);
      
      const orderIds = ordersData.map(order => order.id);
      const { data: tablesData, error: tablesError } = await supabase
        .from('order_tables')
        .select('*')
        .in('order_id', orderIds);
      
      if (tablesError) {
        console.error('Error fetching order tables:', tablesError);
        toast.error(`Failed to fetch order tables: ${tablesError.message}`);
      }
      
      const tablesByOrder = (tablesData || []).reduce((acc, table) => {
        if (!acc[table.order_id]) {
          acc[table.order_id] = [];
        }
        acc[table.order_id].push({
          id: table.id,
          size: table.size,
          colour: table.colour,
          quantity: table.quantity,
          price: table.price
        });
        return acc;
      }, {} as Record<string, TableItem[]>);
      
      const ordersWithTablesAndDates = ordersData.map((order: any) => ({
        ...order,
        id: order.id,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: tablesByOrder[order.id] || [],
        note: order.note || undefined,
        status: order.status as OrderStatus,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined,
        assignedTo: order.delivery_person_id,
        totalPrice: order.price
      }));
      
      setOrders(ordersWithTablesAndDates);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('An unexpected error occurred while fetching orders');
    }
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'status' | 'createdAt'>) => {
    if (!user) {
      toast.error("You must be logged in to place an order");
      return;
    }

    try {
      const calculatedTotalPrice = orderData.tables.reduce((sum, table) => 
        sum + (table.price * table.quantity), 0);
      
      const finalTotalPrice = calculatedTotalPrice;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: orderData.customerName,
          address: orderData.address,
          contact_number: orderData.contactNumber,
          note: orderData.note || null,
          created_by: user.id,
          price: finalTotalPrice,
          status: 'pending',
          colour: orderData.tables[0].colour,
          table_size: orderData.tables[0].size,
          quantity: orderData.tables.reduce((sum, table) => sum + table.quantity, 0)
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        toast.error('Failed to create order: ' + orderError.message);
        return;
      }
      
      if (orderData.tables && orderData.tables.length > 0) {
        const tablesData = orderData.tables.map(table => ({
          order_id: order.id,
          size: table.size,
          colour: table.colour,
          quantity: table.quantity,
          price: table.price
        }));
        
        const { error: tablesError } = await supabase
          .from('order_tables')
          .insert(tablesData);
        
        if (tablesError) {
          console.error('Error creating order tables:', tablesError);
          toast.error('Failed to create order tables: ' + tablesError.message);
          return;
        }
      }

      fetchOrders();
      toast.success('Order created successfully!');
    } catch (error) {
      console.error('Error adding order:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const assignOrder = async (orderId: string, assignedTo: string) => {
    try {
      console.log(`Assigning order ${orderId} to ${assignedTo}`);
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'assigned',
          delivery_person_id: assignedTo,
          delivery_status: 'assigned'
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error assigning order:', error);
        toast.error('Failed to assign order: ' + error.message);
        return;
      }

      console.log(`Order ${orderId} assigned successfully`);

      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: 'assigned' as OrderStatus, assignedTo } 
            : order
        )
      );
      
      toast.success('Order assigned successfully');
    } catch (error) {
      console.error('Error assigning order:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const completeOrder = async (orderId: string) => {
    try {
      console.log(`Completing order ${orderId}`);
      
      const now = new Date();
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          completed_at: now.toISOString(),
          delivery_status: 'completed'
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error completing order:', error);
        toast.error('Failed to complete order: ' + error.message);
        return;
      }

      console.log(`Order ${orderId} completed successfully`);

      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: 'completed' as OrderStatus, completedAt: now } 
            : order
        )
      );
      
      toast.success('Order completed successfully');
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const getFilteredOrders = (status?: OrderStatus) => {
    if (!status) return orders;
    return orders.filter(order => order.status === status);
  };

  const getAssignedOrders = () => {
    return orders.filter(order => order.status === 'assigned');
  };

  return (
    <AppContext.Provider 
      value={{ 
        orders,
        addOrder,
        assignOrder,
        completeOrder,
        getFilteredOrders,
        getAssignedOrders
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  
  return { ...context, userRole: useAuth().userRole };
};
