
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, OrderStatus } from '@/types/order';
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

const STORAGE_KEY = 'tableflow-orders';
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
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      let query = supabase.from('orders').select('*');
      
      // Apply filters based on user role
      if (userRole === 'customer') {
        query = query.eq('created_by', user.id);
      } else if (userRole === 'delivery') {
        query = query.eq('delivery_person_id', user.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }
      
      // Convert string dates to Date objects
      const ordersWithDates = data.map((order: any) => ({
        ...order,
        id: order.id,
        createdAt: new Date(order.created_at),
        completedAt: order.completed_at ? new Date(order.completed_at) : undefined
      }));
      
      setOrders(ordersWithDates);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Save userRole to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(USER_ROLE_KEY, userRole);
  }, [userRole]);

  const switchRole = (role: UserRole) => {
    setUserRole(role);
    toast.success(`Switched to ${role} role`);
    // Refresh orders when role changes
    fetchOrders();
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'status' | 'createdAt'>) => {
    if (!user) {
      toast.error("You must be logged in to place an order");
      return;
    }

    try {
      // Prepare the order data for the database
      const newOrderData = {
        customer_name: orderData.customerName,
        address: orderData.address,
        contact_number: orderData.contactNumber,
        table_size: orderData.tableSize,
        colour: orderData.colour,
        quantity: orderData.quantity,
        note: orderData.note,
        created_by: user.id,
        price: calculatePrice(orderData.tableSize, orderData.quantity),
        status: 'pending'
      };

      // Insert into database
      const { data, error } = await supabase
        .from('orders')
        .insert(newOrderData)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating order:', error);
        toast.error('Failed to create order: ' + error.message);
        return;
      }

      // Convert the returned database record to our app's Order format
      const newOrder: Order = {
        id: data.id,
        customerName: data.customer_name,
        address: data.address,
        contactNumber: data.contact_number,
        tableSize: data.table_size,
        colour: data.colour,
        quantity: data.quantity,
        note: data.note,
        status: data.status as OrderStatus,
        createdAt: new Date(data.created_at)
      };

      // Update local state
      setOrders(prev => [...prev, newOrder]);
      toast.success('Order created successfully!');

    } catch (error) {
      console.error('Error adding order:', error);
      toast.error('An unexpected error occurred');
    }
  };

  // Calculate price based on table size and quantity
  const calculatePrice = (tableSize: string, quantity: number): number => {
    const basePrices: Record<string, number> = {
      'small': 200,
      'medium': 350,
      'large': 500,
      'xl': 750,
      'custom': 1000
    };
    
    return (basePrices[tableSize] || 350) * quantity;
  };

  const assignOrder = async (orderId: string, assignedTo: string) => {
    try {
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

      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: 'assigned' as OrderStatus, assignedTo } 
            : order
        )
      );
    } catch (error) {
      console.error('Error assigning order:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const completeOrder = async (orderId: string) => {
    try {
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

      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: 'completed' as OrderStatus, completedAt: now } 
            : order
        )
      );
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
