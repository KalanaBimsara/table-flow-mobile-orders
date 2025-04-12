
import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { NewOrderForm } from '@/components/NewOrderForm';
import { OrderList } from '@/components/OrderList';

const Dashboard: React.FC = () => {
  const { refreshOrders } = useApp();
  const { profile } = useAuth();

  useEffect(() => {
    refreshOrders();
  }, []);

  return (
    <div className="container py-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(profile?.role === 'admin' || profile?.role === 'customer') && (
          <div className="lg:col-span-1">
            <NewOrderForm />
          </div>
        )}
        <div className={profile?.role === 'delivery' ? 'lg:col-span-2' : 'lg:col-span-1'}>
          <OrderList />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
