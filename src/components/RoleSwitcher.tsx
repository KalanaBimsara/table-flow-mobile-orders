
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { UserRound, Truck, UserCog, Store } from 'lucide-react';

const RoleSwitcher: React.FC = () => {
  const { userRole, switchRole } = useApp();

  return (
    <div className="flex items-center space-x-2 p-2">
      <Button
        variant={userRole === 'admin' ? 'default' : 'outline'}
        size="sm"
        className="flex items-center gap-2"
        onClick={() => switchRole('admin')}
      >
        <UserCog size={16} />
        <span className="hidden sm:inline">Admin</span>
      </Button>
      <Button
        variant={userRole === 'seller' ? 'default' : 'outline'}
        size="sm"
        className="flex items-center gap-2"
        onClick={() => switchRole('seller')}
      >
        <Store size={16} />
        <span className="hidden sm:inline">Seller</span>
      </Button>
      <Button
        variant={userRole === 'customer' ? 'default' : 'outline'}
        size="sm"
        className="flex items-center gap-2"
        onClick={() => switchRole('customer')}
      >
        <UserRound size={16} />
        <span className="hidden sm:inline">Customer</span>
      </Button>
      <Button
        variant={userRole === 'delivery' ? 'default' : 'outline'}
        size="sm"
        className="flex items-center gap-2"
        onClick={() => switchRole('delivery')}
      >
        <Truck size={16} />
        <span className="hidden sm:inline">Delivery</span>
      </Button>
    </div>
  );
};

export default RoleSwitcher;
