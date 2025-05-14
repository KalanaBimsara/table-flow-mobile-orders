
import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import Dashboard from './Dashboard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { userRole } = useAuth();
  const { orders } = useApp();

  // Subscribe to changes on orders table to show notifications
  useEffect(() => {
    // Only subscribe to notifications if the user is an admin or delivery person
    if (!userRole || (userRole !== 'admin' && userRole !== 'delivery')) {
      return;
    }

    const channel = supabase
      .channel('order-notifications')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        }, 
        (payload) => {
          // New order notification
          toast.success('New Order Added', {
            description: `Customer: ${payload.new.customer_name}, Tables: ${payload.new.quantity}`,
            duration: 5000,
          });
        }
      )
      .subscribe();
    
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);
  
  return <Dashboard />;
};

export default Index;
