
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
        async (payload) => {
          // New order notification
          toast.success('New Order Added', {
            description: `Customer: ${payload.new.customer_name}, Tables: ${payload.new.quantity}`,
            duration: 5000,
          });
          
          // Try to send push notification if service worker is ready
          try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              const orderData = {
                customerName: payload.new.customer_name,
                tables: [{
                  quantity: payload.new.quantity
                }]
              };
              
              // Call edge function to send push notification
              await fetch('/api/send-push-notification', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order: orderData }),
              });
            }
          } catch (error) {
            console.error('Failed to send push notification:', error);
          }
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
