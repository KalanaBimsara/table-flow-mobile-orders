
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { UserRound, Truck } from 'lucide-react';

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
        <UserRound size={16} />
        <span className="hidden sm:inline">Admin</span>
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
