/**
 * Auth context: session bootstrap, login/register/logout, current user.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from '@workspace/api-client-react';
import type { LoginResponse, RegisterRequest, UserProfile } from '@workspace/api-client-react';
import {
  beginLogout,
  clearTokens,
  hasSession,
  refreshSession,
  setSessionExpiredListener,
  storeTokens,
} from '@/lib/auth-tokens';

interface AuthContextValue {
  /** True while the initial session bootstrap is running. */
  isLoading: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetch the current user profile from the backend. */
  refreshUser: () => Promise<void>;
  /** Clear local session state (e.g. after a password change revokes sessions). */
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    clearTokens();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Bootstrap: resume the session from the stored refresh token, if any.
  useEffect(() => {
    setSessionExpiredListener(() => setUser(null));

    let cancelled = false;
    (async () => {
      try {
        if (hasSession()) {
          const token = await refreshSession();
          if (token && !cancelled) {
            const profile = await getCurrentUser();
            if (!cancelled) setUser(profile);
          }
        }
      } catch (error) {
        console.warn('Session bootstrap failed', error);
        clearTokens();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setSessionExpiredListener(null);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin({ email, password });
    storeTokens(response.tokens);
    setUser(response.user);
    return response;
  }, []);

  const register = useCallback(
    async (data: RegisterRequest) => {
      await apiRegister(data);
      // Registration does not return tokens — sign in with the new credentials.
      await login(data.email, data.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      // beginLogout ensures a valid access token FIRST (any silent refresh
      // completes and the timer is disarmed), then returns the CURRENT
      // refresh token — so the server revokes the live session, not a stale,
      // already-rotated token.
      const refreshToken = await beginLogout();
      if (refreshToken) await apiLogout({ refreshToken });
    } catch (error) {
      // Revocation failure must not trap the user in a session.
      console.warn('Logout revocation failed', error);
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const profile = await getCurrentUser();
    setUser(profile);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: user !== null,
      user,
      login,
      register,
      logout,
      refreshUser,
      clearSession,
    }),
    [isLoading, user, login, register, logout, refreshUser, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
