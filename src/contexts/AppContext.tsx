
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, OrderStatus } from '@/types/order';
import { useAuth } from './AuthContext';
import { OrderService, OrderInput } from '@/services/OrderService';
import { toast } from 'sonner';
import { UserRole } from './AuthContext';

interface AppContextType {
  orders: Order[];
  loading: boolean;
  userRole?: UserRole; // Added for RoleSwitcher
  switchRole: (role: UserRole) => void; // Added for RoleSwitcher
  addOrder: (order: OrderInput) => Promise<void>;
  assignOrder: (orderId: string, assignedTo: string) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
  getFilteredOrders: (status?: OrderStatus) => Order[];
  refreshOrders: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('admin'); // Default role
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
    // Set user role from profile when available
    if (profile?.role) {
      setUserRole(profile.role);
    }
  }, [user, profile]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await OrderService.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const refreshOrders = async () => {
    await fetchOrders();
  };

  const switchRole = (role: UserRole) => {
    setUserRole(role);
  };

  const addOrder = async (orderData: OrderInput) => {
    try {
      await OrderService.addOrder(orderData, user?.id);
      toast.success('Order added successfully');
      await fetchOrders();
    } catch (error) {
      console.error('Failed to add order:', error);
      toast.error('Failed to add order');
      throw error;
    }
  };

  const assignOrder = async (orderId: string, assignedTo: string) => {
    try {
      await OrderService.assignOrder(orderId, assignedTo);
      toast.success('Order assigned successfully');
      await fetchOrders();
    } catch (error) {
      console.error('Failed to assign order:', error);
      toast.error('Failed to assign order');
      throw error;
    }
  };

  const completeOrder = async (orderId: string) => {
    try {
      await OrderService.completeOrder(orderId);
      toast.success('Order marked as completed');
      await fetchOrders();
    } catch (error) {
      console.error('Failed to complete order:', error);
      toast.error('Failed to complete order');
      throw error;
    }
  };

  const getFilteredOrders = (status?: OrderStatus) => {
    if (!status) return orders;
    return orders.filter(order => order.status === status);
  };

  return (
    <AppContext.Provider
      value={{
        orders,
        loading,
        userRole,
        switchRole,
        addOrder,
        assignOrder,
        completeOrder,
        getFilteredOrders,
        refreshOrders
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
