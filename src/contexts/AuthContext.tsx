
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserRole } from '@/types/order';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userRole: UserRole | null;
  canViewAllOrders: boolean;
  permissionsLoaded: boolean;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, role: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [canViewAllOrders, setCanViewAllOrders] = useState(false);
  // False until can_view_all_orders has been read for the signed-in user.
  // Order fetches wait for this; otherwise the first fetch always ran with
  // the default "own orders only" filter.
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isSigningUp = useRef(false);
  const permissionsUserId = useRef<string | null>(null);
  const permissionsRequest = useRef(0);

  useEffect(() => {
    const readPermissions = async (userId: string): Promise<boolean | null> => {
      // A failed read must not quietly become "own orders only", so retry and
      // report null (unknown) if it still fails.
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, can_view_all_orders')
          .eq('id', userId)
          .maybeSingle();

        if (!error) {
          const profile = data as { role?: string | null; can_view_all_orders?: boolean | null } | null;
          return profile?.role === 'manager' || profile?.can_view_all_orders === true;
        }
        console.error('Failed to load order permissions:', error);
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
      return null;
    };

    const loadPermissions = async (userId: string) => {
      const request = ++permissionsRequest.current;
      const canViewAll = await readPermissions(userId);
      // Ignore answers for an older request or a user who has since signed out.
      if (request !== permissionsRequest.current || permissionsUserId.current !== userId) return;
      if (canViewAll !== null) setCanViewAllOrders(canViewAll);
      setPermissionsLoaded(true);
    };

    const applySession = (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      const userId = session?.user?.id ?? null;
      if (userId !== permissionsUserId.current) {
        // Different user (or signed out): forget the previous user's permission
        // before anything fetches orders for the new one.
        permissionsUserId.current = userId;
        setCanViewAllOrders(false);
        setPermissionsLoaded(false);
      }

      if (session?.user) {
        // Fetch user role from metadata
        setUserRole(session.user.user_metadata.role as UserRole);
        // Deferred so the Supabase query does not run inside the auth callback.
        setTimeout(() => loadPermissions(session.user.id), 0);
      } else {
        setUserRole(null);
        permissionsRequest.current++;
      }
    };

    // Pick up changes made in the super admin dashboard without a reload:
    // re-check when the tab regains focus and every minute while visible.
    const refreshPermissions = () => {
      if (permissionsUserId.current && document.visibilityState === 'visible') {
        loadPermissions(permissionsUserId.current);
      }
    };
    window.addEventListener('focus', refreshPermissions);
    document.addEventListener('visibilitychange', refreshPermissions);
    const refreshTimer = window.setInterval(refreshPermissions, 60_000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        applySession(session);
        
        if (event === 'SIGNED_IN') {
          // Only show toast if not coming from signup (to avoid duplicate notification)
          // Removed successfully signed in notification as per request
          // Reset the flag after a short delay
          setTimeout(() => {
            isSigningUp.current = false;
          }, 1000);
        } else if (event === 'SIGNED_OUT') {
          toast.success('Successfully signed out');
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', refreshPermissions);
      document.removeEventListener('visibilitychange', refreshPermissions);
      window.clearInterval(refreshTimer);
    };
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: string) => {
    try {
      // Ensure the role matches the enum values exactly
      if (!['customer', 'delivery', 'admin', 'manager'].includes(role)) {
        throw new Error("Invalid role. Must be one of: customer, delivery, admin, manager");
      }

      // Set flag to suppress duplicate SIGNED_IN notification
      isSigningUp.current = true;

      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role
          }
        }
      });
      
      if (error) {
        isSigningUp.current = false; // Reset on error
        throw error;
      }
      
      // Only show registration toast - if user is auto-signed in, we won't show SIGNED_IN toast
      toast.success('Registration successful! Please check your email for verification.');
      navigate('/auth');
      
      // Reset flag after showing the registration message
      setTimeout(() => {
        isSigningUp.current = false;
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during sign up');
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userRole,
        canViewAllOrders,
        permissionsLoaded,
        loading,
        signUp,
        signIn,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
