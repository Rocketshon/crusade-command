import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { saveUser, clearUser } from './storage';

interface AuthContextType {
  user: User | null;
  profile: { display_name: string } | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ display_name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('cc_profiles')
        .select('display_name')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile({ display_name: data.display_name });
        return data.display_name as string;
      }
    } catch {
      // Profile fetch failed — non-critical
    }
    return null;
  }, []);

  // Sync auth user to localStorage cache for fast route redirects
  const syncUserToStorage = useCallback((authUser: User | null, displayName: string | null) => {
    if (authUser) {
      saveUser({
        id: authUser.id,
        email: authUser.email ?? '',
        display_name: displayName ?? authUser.user_metadata?.display_name ?? authUser.email?.split('@')[0] ?? 'Commander',
      });
    } else {
      clearUser();
    }
  }, []);

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const displayName = await fetchProfile(currentSession.user.id);
        syncUserToStorage(currentSession.user, displayName);
      }

      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const displayName = await fetchProfile(newSession.user.id);
        syncUserToStorage(newSession.user, displayName);
      } else {
        setProfile(null);
        syncUserToStorage(null, null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, syncUserToStorage]);

  const signUp = useCallback(async (email: string, password: string, displayName: string): Promise<{ error?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { error: 'Email already in use. Please sign in or use a different email.' };
      }
      if (error.message.includes('Password')) {
        return { error: 'Password is too weak. Please use at least 8 characters.' };
      }
      if (error.message.includes('Database error')) {
        return { error: 'Account creation failed. Please try again.' };
      }
      return { error: error.message };
    }

    // Create profile row (instead of relying on DB trigger)
    if (data.user) {
      try {
        await supabase.from('cc_profiles').upsert({
          id: data.user.id,
          display_name: displayName || email.split('@')[0],
        }, { onConflict: 'id' });
      } catch {
        // Profile creation failed — non-critical, will retry on next auth state change
      }
    }

    return {};
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Invalid email or password. Please try again.' };
      }
      return { error: error.message };
    }

    return {};
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    clearUser();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      isLoading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
