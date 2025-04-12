
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { NewOrderForm } from '@/components/NewOrderForm';
import { OrderList } from '@/components/OrderList';

const Dashboard: React.FC = () => {
  const { userRole } = useApp();

  return (
    <div className="container py-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {userRole === 'admin' && (
          <div className="lg:col-span-1">
            <NewOrderForm />
          </div>
        )}
        <div className={userRole === 'admin' ? 'lg:col-span-1' : 'lg:col-span-2'}>
          <OrderList />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
