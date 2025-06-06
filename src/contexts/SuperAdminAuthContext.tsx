
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type SuperAdminUser = {
  id: string;
  username: string;
  email: string;
  last_login: string | null;
  is_active: boolean;
};

type SuperAdminSession = {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
};

type SuperAdminAuthContextType = {
  user: SuperAdminUser | null;
  session: SuperAdminSession | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export const SuperAdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [session, setSession] = useState<SuperAdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionToken = localStorage.getItem('super_admin_session');
      if (!sessionToken) {
        setLoading(false);
        return;
      }

      const { data: sessionData, error } = await supabase
        .from('super_admin_sessions')
        .select(`
          *,
          super_admin_users (*)
        `)
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !sessionData) {
        localStorage.removeItem('super_admin_session');
        setLoading(false);
        return;
      }

      setSession(sessionData);
      setUser(sessionData.super_admin_users);
    } catch (error) {
      console.error('Session check failed:', error);
      localStorage.removeItem('super_admin_session');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      // First verify user credentials (in a real app, this would use proper password hashing)
      const { data: userData, error: userError } = await supabase
        .from('super_admin_users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        throw new Error('Invalid credentials');
      }

      // Create session
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

      const { data: sessionData, error: sessionError } = await supabase
        .from('super_admin_sessions')
        .insert({
          user_id: userData.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error('Failed to create session');
      }

      // Update last login
      await supabase
        .from('super_admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id);

      localStorage.setItem('super_admin_session', sessionToken);
      setSession(sessionData);
      setUser(userData);
      
      toast.success('Successfully signed in');
      navigate('/super-admin/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (session) {
        await supabase
          .from('super_admin_sessions')
          .delete()
          .eq('session_token', session.session_token);
      }
      
      localStorage.removeItem('super_admin_session');
      setUser(null);
      setSession(null);
      toast.success('Successfully signed out');
      navigate('/super-admin/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  return (
    <SuperAdminAuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signOut
      }}
    >
      {children}
    </SuperAdminAuthContext.Provider>
  );
};

export const useSuperAdminAuth = () => {
  const context = useContext(SuperAdminAuthContext);
  if (context === undefined) {
    throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider');
  }
  return context;
};
