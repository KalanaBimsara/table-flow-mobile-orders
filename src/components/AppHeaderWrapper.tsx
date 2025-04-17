
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from './AppHeader';
import { Separator } from '@/components/ui/separator';
import { useLocation } from 'react-router-dom';

const AppHeaderWrapper = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Always show header for the order page
  const isPublicOrderPage = location.pathname === '/order';
  const shouldShowHeader = user || isPublicOrderPage;
  
  return (
    <header>
      {shouldShowHeader && (
        <>
          <AppHeader />
          <Separator />
        </>
      )}
    </header>
  );
};

export default AppHeaderWrapper;
