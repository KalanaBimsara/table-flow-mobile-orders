
import React from 'react';
import { Menu, Home, Package, History, Table, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useApp } from '@/contexts/AppContext';
import RoleSwitcher from './RoleSwitcher';
import { Link, useLocation } from 'react-router-dom';

const AppHeader: React.FC = () => {
  const { userRole } = useApp();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/orders', label: 'Orders', icon: Package },
    { href: '/history', label: 'Order History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center">
        <div className="flex items-center mr-4 font-semibold">
          <Table className="h-6 w-6 mr-2" />
          <span className="hidden md:inline">TableFlow</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 mx-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`text-sm font-medium transition-colors flex items-center gap-2 ${
                location.pathname === item.href
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile nav */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] sm:w-[300px]">
            <div className="flex items-center justify-between pb-6">
              <div className="flex items-center font-semibold">
                <Table className="h-6 w-6 mr-2" />
                <span>TableFlow</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-2 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    location.pathname === item.href
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="ml-auto flex items-center">
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
