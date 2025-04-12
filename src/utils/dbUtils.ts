
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/contexts/AuthContext';

// Helper function to create an admin user
export const createAdminUser = async (email: string, password: string, fullName: string) => {
  // First, sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'admin',
      },
    },
  });

  if (authError) {
    console.error('Error creating admin user:', authError);
    throw authError;
  }

  return authData;
};

// Helper function to update user role
export const updateUserRole = async (userId: string, role: UserRole) => {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Helper function to get all users (admin only)
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return data;
};
