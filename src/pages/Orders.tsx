
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { OrderList } from '@/components/OrderList';
import { NewOrderForm } from '@/components/NewOrderForm';

const Orders: React.FC = () => {
  const { userRole } = useApp();

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Orders Management</h1>
      
      {userRole === 'customer' && (
        <div className="grid grid-cols-1 gap-6 mb-6">
          <NewOrderForm />
        </div>
      )}
      
      <OrderList />
    </div>
  );
};

export default Orders;
