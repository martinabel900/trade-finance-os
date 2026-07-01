import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { User, UserCredential } from 'firebase/auth';
import { loginWithEmail, logout, subscribeToAuth } from '../services/authService';
import { getOrCreateUserProfile, type UserProfile, type UserRole } from '../services/userService';
import { AuthContext } from './authContext';

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextValue {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  user: User | null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToAuth(async (nextUser) => {
      setLoading(true);
      setCurrentUser(nextUser);
      if (!nextUser) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getOrCreateUserProfile(nextUser);
        if (active) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Unable to load user profile', error);
        if (active) {
          setUserProfile(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, () => {
      setCurrentUser(null);
      setUserProfile(null);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const role = userProfile?.role ?? 'user';

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      userProfile,
      role,
      isAdmin: role === 'admin',
      isManager: role === 'admin' || role === 'manager',
      isUser: role === 'user',
      loading,
      login: (email, password) => loginWithEmail(email, password),
      logout,
      user: currentUser,
    }),
    [currentUser, loading, role, userProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
