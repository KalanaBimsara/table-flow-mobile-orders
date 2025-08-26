
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { NewOrderForm } from '@/components/NewOrderForm';
import { OrderList } from '@/components/OrderList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, ShoppingBag, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { userRole } = useAuth();

  return (
    <div className="container py-6 space-y-6">
      {/* Admin Dashboard View */}
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog size={20} />
                  Admin Dashboard
                </CardTitle>
                <CardDescription>Manage orders and view all system activity</CardDescription>
              </CardHeader>
              <CardContent>
                <NewOrderForm />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <OrderList />
          </div>
        </div>
      )}

      {/* Customer Dashboard View */}
      {userRole === 'customer' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag size={20} />
                Customer Dashboard
              </CardTitle>
              <CardDescription>Place orders for custom furniture tables</CardDescription>
            </CardHeader>
            <CardContent>
              <NewOrderForm />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delivery Dashboard View */}
      {userRole === 'delivery' && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck size={20} />
                Delivery Dashboard
              </CardTitle>
              <CardDescription>View and manage assigned deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderList />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
