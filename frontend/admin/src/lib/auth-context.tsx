"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/types/api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  /**
   * Set when the initial session check itself failed to complete (network
   * error, timeout, server error) - as opposed to completing and finding no
   * one logged in (a plain 401, which just means `user` is null). Lets
   * consumers show "couldn't verify your session" instead of silently
   * treating an unreachable API the same as "not logged in".
   */
  error: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guards against overlapping /auth/me calls (e.g. someone clicking "Try
  // again" more than once before the first attempt has settled) - without
  // this, concurrent requests can resolve out of order and stomp on each
  // other's state, and the UI gives no feedback that a retry is even in
  // flight.
  const isRefreshingRef = useRef(false);

  // The actual /auth/me round trip. Deliberately has no synchronous setState
  // before its first `await` - every state update here happens as a
  // reaction to the request settling, never as an immediate side effect of
  // being called. That's what lets the mount effect below invoke it without
  // tripping react-hooks/set-state-in-effect (calling setIsLoading(true)
  // synchronously inside a bare effect body causes an extra forced render).
  const performCheck = useCallback(async () => {
    try {
      const me = await api.get<User>("/api/v1/auth/me");
      setUser(me);
      setError(null);
    } catch (caught) {
      setUser(null);
      // A 401 is the API correctly telling us no one is logged in - that's
      // not a failure. Anything else (timeout, network error, 5xx) means we
      // don't actually know the auth state and should say so.
      if (caught instanceof ApiError && caught.status === 401) {
        setError(null);
      } else if (caught instanceof ApiError) {
        setError(caught.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }, []);

  // Public, imperative version for user-triggered retries (e.g. the "Try
  // again" button) - safe to set isLoading synchronously here since it's
  // invoked from an event handler, not an effect body.
  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsLoading(true);
    try {
      await performCheck();
    } finally {
      isRefreshingRef.current = false;
      setIsLoading(false);
    }
  }, [performCheck]);

  useEffect(() => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    performCheck().finally(() => {
      isRefreshingRef.current = false;
      setIsLoading(false);
    });
  }, [performCheck]);

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      const me = await api.post<User>("/api/v1/auth/login", {
        email,
        password,
        remember,
      });
      setUser(me);
      setError(null);
      return me;
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.post("/api/v1/auth/logout");
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, error, login, logout, refresh }),
    [user, isLoading, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
