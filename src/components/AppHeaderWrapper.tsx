
import React from 'react';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/UserMenu';

const AppHeaderWrapper: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-between w-full">
      <AppHeader />
      {user && <UserMenu />}
    </div>
  );
};

export default AppHeaderWrapper;
