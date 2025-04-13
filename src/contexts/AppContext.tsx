import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, OrderStatus } from '@/types/order';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'seller' | 'delivery' | 'customer';

interface AppContextType {
  orders: Order[];
  userRole: UserRole;
  switchRole: (role: UserRole) => void;
  addOrder: (order: Omit<Order, 'id' | 'status' | 'createdAt'>) => void;
  assignOrder: (orderId: string, assignedTo: string) => void;
  completeOrder: (orderId: string) => void;
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

  useEffect(() => {
    const savedOrders = localStorage.getItem(STORAGE_KEY);
    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders);
        const ordersWithDates = parsedOrders.map((order: any) => ({
          ...order,
          createdAt: new Date(order.createdAt),
          completedAt: order.completedAt ? new Date(order.completedAt) : undefined
        }));
        setOrders(ordersWithDates);
      } catch (error) {
        console.error('Failed to parse saved orders:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(USER_ROLE_KEY, userRole);
  }, [userRole]);

  const switchRole = (role: UserRole) => {
    setUserRole(role);
    toast.success(`Switched to ${role} role`);
  };

  const addOrder = (orderData: Omit<Order, 'id' | 'status' | 'createdAt'>) => {
    const newOrder: Order = {
      ...orderData,
      id: uuidv4(),
      status: 'pending',
      createdAt: new Date()
    };
    setOrders(prev => [...prev, newOrder]);
  };

  const assignOrder = (orderId: string, assignedTo: string) => {
    setOrders(prev => 
      prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'assigned' as OrderStatus, assignedTo } 
          : order
      )
    );
  };

  const completeOrder = (orderId: string) => {
    setOrders(prev => 
      prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'completed' as OrderStatus, completedAt: new Date() } 
          : order
      )
    );
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
