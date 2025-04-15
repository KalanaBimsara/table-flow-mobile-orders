
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from './AppHeader';
import { Separator } from '@/components/ui/separator';

const AppHeaderWrapper = () => {
  const { user } = useAuth();
  
  return (
    <header>
      {user && (
        <>
          <AppHeader />
          <Separator />
        </>
      )}
    </header>
  );
};

export default AppHeaderWrapper;
