
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'biller' | 'kitchen_manager';

interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: Profile | null;
  profile: Profile | null;
  session: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, expectedRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

// Type for the verify_user_password function response
interface VerifyPasswordResponse {
  user_id: string;
  email: string;
  role: string;
  full_name: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session in localStorage
    const storedUser = localStorage.getItem('authenticated_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setProfile(userData);
        setSession(userData);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('authenticated_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string, expectedRole?: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('Attempting sign in for:', email, 'with expected role:', expectedRole);
      
      // Call the Supabase function to verify password
      const { data, error } = await supabase
        .rpc('verify_user_password', {
          user_email: email,
          user_password: password
        });

      if (error) {
        console.error('Login error:', error);
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const userData = data[0] as VerifyPasswordResponse;
        console.log('Login successful for user:', userData);
        
        // Check if role matches expected role
        if (expectedRole && userData.role !== expectedRole) {
          toast({
            title: "Access Denied",
            description: `This account is not authorized as ${expectedRole === 'biller' ? 'Biller' : 'Kitchen Manager'}`,
            variant: "destructive",
          });
          return { success: false, error: `Role mismatch. Expected ${expectedRole}, got ${userData.role}` };
        }

        // Create user profile object
        const userProfile: Profile = {
          id: userData.user_id,
          email: userData.email,
          role: userData.role as UserRole,
          full_name: userData.full_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Store in state and localStorage
        setUser(userProfile);
        setProfile(userProfile);
        setSession(userProfile);
        localStorage.setItem('authenticated_user', JSON.stringify(userProfile));

        toast({
          title: "Welcome back!",
          description: "Successfully logged in",
        });
        
        return { success: true };
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive",
        });
        return { success: false, error: "Invalid credentials" };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred during login",
        variant: "destructive",
      });
      return { success: false, error: "An unexpected error occurred" };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setProfile(null);
      setSession(null);
      localStorage.removeItem('authenticated_user');
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
