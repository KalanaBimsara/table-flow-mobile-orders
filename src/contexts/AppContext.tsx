
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, OrderStatus } from '@/types/order';
import { v4 as uuidv4 } from 'uuid';

type UserRole = 'admin' | 'delivery';

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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('admin');

  // Load orders from localStorage on initial render
  useEffect(() => {
    const savedOrders = localStorage.getItem(STORAGE_KEY);
    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders);
        // Convert string dates back to Date objects
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

  // Save orders to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const switchRole = (role: UserRole) => {
    setUserRole(role);
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
