import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { saveUser, clearUser, loadUser, generateId } from './storage';

// NOTE: cc_profiles.display_name should have a UNIQUE constraint in Supabase:
//   ALTER TABLE cc_profiles ADD CONSTRAINT cc_profiles_display_name_unique UNIQUE (display_name);
// The ilike check below handles the common case, and the 23505 handler catches race conditions.

interface SimpleUser {
  id: string;
  username: string;
}

interface AuthContextType {
  user: SimpleUser | null;
  isLoading: boolean;
  signIn: (username: string) => Promise<{ error?: string }>;
  signOut: () => void;
  updateUsername: (newName: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const stored = loadUser();
    if (stored) {
      setUser({ id: stored.id, username: stored.display_name });
    }
    setIsLoading(false);
  }, []);

  // DESIGN DECISION: Username-only auth means anyone can "log in" as any existing user.
  // This is an intentional tradeoff for simplicity at in-person gaming events.
  // The user explicitly chose this over email/password auth. For a public deployment,
  // add proper authentication (e.g. Supabase Auth with email/password or OAuth).
  const signIn = useCallback(async (username: string): Promise<{ error?: string }> => {
    const trimmed = username.trim();
    if (!trimmed) return { error: 'Please enter a username.' };
    if (trimmed.length < 2) return { error: 'Username must be at least 2 characters.' };
    if (trimmed.length > 30) return { error: 'Username must be 30 characters or less.' };
    if (!/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) return { error: 'Username can only contain letters, numbers, spaces, hyphens, and underscores.' };

    // Check if username is taken (in Supabase)
    if (isSupabaseConfigured()) {
      try {
        const { data: existing } = await supabase
          .from('cc_profiles')
          .select('id, display_name')
          .ilike('display_name', trimmed)
          .maybeSingle();

        if (existing) {
          // Username exists — log in as that user
          const userObj: SimpleUser = { id: existing.id, username: existing.display_name };
          setUser(userObj);
          saveUser({ id: existing.id, email: '', display_name: existing.display_name });
          return {};
        }

        // New username — create profile
        const newId = generateId();
        const { error } = await supabase
          .from('cc_profiles')
          .insert({ id: newId, display_name: trimmed });

        if (error) {
          // Handle race condition: another client inserted the same username
          if (error.code === '23505') {
            return { error: 'Username already taken.' };
          }
          console.warn('Failed to create cloud profile:', error.message);
          // Fall through to local-only
        } else {
          const userObj: SimpleUser = { id: newId, username: trimmed };
          setUser(userObj);
          saveUser({ id: newId, email: '', display_name: trimmed });
          return {};
        }
      } catch (err) {
        console.warn('Cloud auth failed, falling back to local:', err);
      }
    }

    // Local-only fallback
    const existingLocal = loadUser();
    if (existingLocal && existingLocal.display_name.toLowerCase() === trimmed.toLowerCase()) {
      // Same user returning
      setUser({ id: existingLocal.id, username: existingLocal.display_name });
      return {};
    }

    // Brand new local user
    const newId = generateId();
    const userObj: SimpleUser = { id: newId, username: trimmed };
    setUser(userObj);
    saveUser({ id: newId, email: '', display_name: trimmed });
    return {};
  }, []);

  const updateUsername = useCallback((newName: string) => {
    setUser(prev => prev ? { ...prev, username: newName } : null);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    clearUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, updateUsername }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
