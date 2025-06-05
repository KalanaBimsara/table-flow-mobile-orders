
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, FileText, History, Cog, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from './UserMenu';
import NotificationButton from './NotificationButton';

const AppHeader: React.FC = () => {
  const location = useLocation();
  const { userRole } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              Furniture Orders
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/"
              className={`transition-colors hover:text-foreground/80 ${
                isActive('/') ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link
              to="/orders"
              className={`transition-colors hover:text-foreground/80 ${
                isActive('/orders') ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <FileText className="mr-2 h-4 w-4" />
                Orders
              </Button>
            </Link>
            <Link
              to="/history"
              className={`transition-colors hover:text-foreground/80 ${
                isActive('/history') ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </Link>
            {userRole === 'admin' && (
              <>
                <Link
                  to="/production"
                  className={`transition-colors hover:text-foreground/80 ${
                    isActive('/production') ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Cog className="mr-2 h-4 w-4" />
                    Production
                  </Button>
                </Link>
                <Link
                  to="/insights"
                  className={`transition-colors hover:text-foreground/80 ${
                    isActive('/insights') ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Insights
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="flex items-center space-x-2">
              <NotificationButton />
              <UserMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
