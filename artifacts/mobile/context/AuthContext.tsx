/**
 * Auth context for Camel Mobility.
 *
 * Manages authentication state: login, register, logout, and session
 * restoration on app startup. Token lifecycle is handled by lib/auth-tokens.ts.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from '@workspace/api-client-react';
import type { UserProfile } from '@workspace/api-client-react';
import {
  beginLogout,
  clearTokens,
  hasSession,
  loadStoredRefreshToken,
  refreshSession,
  setSessionExpiredListener,
  storeTokens,
} from '@/lib/auth-tokens';

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionExpiredHandlerRef = useRef<() => void>(() => setUser(null));

  useEffect(() => {
    // Keep the handler ref current so the closure captures the latest setter
    sessionExpiredHandlerRef.current = () => setUser(null);
  });

  useEffect(() => {
    setSessionExpiredListener(() => sessionExpiredHandlerRef.current());

    const restoreSession = async () => {
      try {
        await loadStoredRefreshToken();
        if (hasSession()) {
          const token = await refreshSession();
          if (token) {
            const profile = await getCurrentUser();
            setUser(profile);
          }
        }
      } catch {
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();

    return () => {
      setSessionExpiredListener(null);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin({ email, password });
    storeTokens(response.tokens);
    setUser(response.user);
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<UserProfile> => {
    const profile = await apiRegister(data);
    // Registration creates a PENDING account — no tokens issued yet.
    // Admin must activate before the customer can log in.
    return profile;
  }, []);

  const logout = useCallback(async () => {
    const rt = await beginLogout();
    try {
      if (rt) {
        await apiLogout({ refreshToken: rt });
      }
    } catch {
      // Server-side logout failure doesn't block client cleanup
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: user !== null, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
