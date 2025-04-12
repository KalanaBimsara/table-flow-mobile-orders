
import React from 'react';
import { Menu, Home, Package, History, Table, X, LogOut, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const AppHeader: React.FC = () => {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const { user, profile, signOut } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Base navigation items for all users
  const baseNavItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/orders', label: 'Orders', icon: Package },
    { href: '/history', label: 'Order History', icon: History },
  ];
  
  // Admin-specific navigation items
  const adminNavItems = [
    { href: '/users', label: 'User Management', icon: Users },
  ];
  
  // Combine navigation items based on user role
  const navItems = profile?.role === 'admin' 
    ? [...baseNavItems, ...adminNavItems] 
    : baseNavItems;

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
              {profile && (
                <>
                  <div className="h-px bg-border my-2"></div>
                  <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                    Signed in as: {profile.full_name || user?.email}
                  </div>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    Role: {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </div>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 justify-start py-1"
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </Button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback>
                      {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Role: {profile?.role.charAt(0).toUpperCase() + profile?.role.slice(1)}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
