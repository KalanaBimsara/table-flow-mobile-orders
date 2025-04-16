
import React from 'react';
import { NewOrderForm } from '@/components/NewOrderForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag } from 'lucide-react';

const PublicOrderForm: React.FC = () => {
  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag size={20} />
            Place Your Order
          </CardTitle>
          <CardDescription>Order custom furniture tables directly</CardDescription>
        </CardHeader>
        <CardContent>
          <NewOrderForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicOrderForm;
