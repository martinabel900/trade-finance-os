import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { User, UserCredential } from 'firebase/auth';
import { loginWithEmail, logout, subscribeToAuth } from '../services/authService';
import { AuthContext } from './authContext';

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextValue {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  user: User | null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((nextUser) => {
      setCurrentUser(nextUser);
      setLoading(false);
    }, () => {
      setCurrentUser(null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      loading,
      login: (email, password) => loginWithEmail(email, password),
      logout,
      user: currentUser,
    }),
    [currentUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
