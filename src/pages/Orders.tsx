
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { OrderList } from '@/components/OrderList';

const Orders: React.FC = () => {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Orders Management</h1>
      <OrderList />
    </div>
  );
};

export default Orders;
