
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, OrderStatus, TableItem } from '@/types/order';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'delivery' | 'customer';

interface AppContextType {
  orders: Order[];
  userRole: UserRole;
  switchRole: (role: UserRole) => void;
  addOrder: (order: Omit<Order, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  assignOrder: (orderId: string, assignedTo: string) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
  getFilteredOrders: (status?: OrderStatus) => Order[];
  getAssignedOrders: () => Order[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const USER_ROLE_KEY = 'tableflow-user-role';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem(USER_ROLE_KEY);
    return (savedRole as UserRole) || 'admin';
  });
  const { user } = useAuth();

  // Load orders when component mounts or user changes
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
      
      // First, fetch the orders
      let query = supabase.from('orders').select('*');
      
      // Apply filters based on user role
      if (userRole === 'customer') {
        query = query.eq('created_by', user.id);
      } else if (userRole === 'delivery') {
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
      
      // Now fetch all tables for these orders
      const orderIds = ordersData.map(order => order.id);
      const { data: tablesData, error: tablesError } = await supabase
        .from('order_tables')
        .select('*')
        .in('order_id', orderIds);
      
      if (tablesError) {
        console.error('Error fetching order tables:', tablesError);
        toast.error(`Failed to fetch order tables: ${tablesError.message}`);
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
          quantity: table.quantity,
          price: table.price
        });
        return acc;
      }, {} as Record<string, TableItem[]>);
      
      // Convert string dates to Date objects and add tables to orders
      const ordersWithTablesAndDates = ordersData.map((order: any) => ({
        ...order,
        id: order.id,
        customerName: order.customer_name,
        address: order.address,
        contactNumber: order.contact_number,
        tables: tablesByOrder[order.id] || [],
        note: order.note || undefined, // Convert null to undefined
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

  // Save userRole to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(USER_ROLE_KEY, userRole);
  }, [userRole]);

  const switchRole = (role: UserRole) => {
    setUserRole(role);
    toast.success(`Switched to ${role} role`);
    // Refresh orders when role changes - handled by useEffect
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'status' | 'createdAt'>) => {
    if (!user) {
      toast.error("You must be logged in to place an order");
      return;
    }

    console.log("Adding order with data:", orderData);

    try {
      // Start a transaction
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: orderData.customerName,
          address: orderData.address,
          contact_number: orderData.contactNumber,
          note: orderData.note || null, // Handle undefined by converting to null
          created_by: user.id,
          price: orderData.totalPrice || orderData.tables.reduce((sum, table) => sum + table.price, 0),
          status: 'pending'
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        toast.error('Failed to create order: ' + orderError.message);
        return;
      }
      
      console.log("Order created with ID:", order.id);
      
      // Insert each table
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

      // Refresh orders to include the new one
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
      
      // Update in database
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

      // Update local state
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
      
      // Update in database
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

      // Update local state
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
        userRole,
        switchRole,
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
  return context;
};
