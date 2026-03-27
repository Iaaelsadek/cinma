import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useState,
} from 'react';
import { AuthSession, getSession, onAuthStateChange } from '../services/auth';

type AuthContextValue = {
  session: AuthSession | null;
  isGuest: boolean;
  isReady: boolean;
  continueAsGuest: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
};

const GUEST_MODE_KEY = 'cinema_guest_mode_v1';

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isGuest: false,
  isReady: false,
  continueAsGuest: async () => {},
  exitGuestMode: async () => {},
  refreshSession: async () => null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const refreshSession = useCallback(async (): Promise<AuthSession | null> => {
    const [value, guestMode] = await Promise.all([
      getSession(),
      AsyncStorage.getItem(GUEST_MODE_KEY),
    ]);
    setSession(value);
    if (value) {
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
    } else {
      setIsGuest(guestMode === 'true');
    }
    setIsReady(true);
    return value;
  }, []);

  useEffect(() => {
    refreshSession();

    const { data } = onAuthStateChange(async (event, nextSession) => {
      if (event === 'SIGNED_IN' && nextSession) {
        setSession(nextSession);
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        setIsReady(true);
        return;
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setIsReady(true);
        return;
      }
      if (nextSession) {
        setSession(nextSession);
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        setIsReady(true);
        return;
      }
      await refreshSession();
    });

    return () => {
      data?.subscription?.unsubscribe?.();
    };
  }, [refreshSession]);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    setSession(null);
    setIsGuest(true);
    setIsReady(true);
  }, []);

  const exitGuestMode = useCallback(async () => {
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setIsGuest(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isGuest,
      isReady,
      continueAsGuest,
      exitGuestMode,
      refreshSession,
    }),
    [session, isGuest, isReady, continueAsGuest, exitGuestMode, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
