import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { hasSupabaseAuthConfig, supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type AuthSession = {
  userId: string;
  email: string;
  token: string;
};

const assertSupabaseConfigured = () => {
  if (!hasSupabaseAuthConfig) {
    throw new Error('Supabase auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
};

const mapSession = (session: Session | null): AuthSession | null => {
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    email: session.user.email || '',
    token: session.access_token || '',
  };
};

export const getSession = async (): Promise<AuthSession | null> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
        await signOut();
        return null;
      }
      throw error;
    }
    return mapSession(data.session);
  } catch (e) {
    return null;
  }
};

export const getCurrentUserId = async () => {
  const session = await getSession();
  return session?.userId || null;
};

export const signOut = async () => {
  await supabase.auth.signOut();
};

export const signIn = async (email: string, password: string): Promise<AuthSession> => {
  assertSupabaseConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  const mapped = mapSession(data.session);
  if (!mapped) {
    throw new Error('Unable to create session from Supabase sign in response.');
  }
  return mapped;
};

export const signInWithGoogle = async (): Promise<void> => {
  assertSupabaseConfigured();
  const redirectTo = makeRedirectUri({
    scheme: 'cinmaonline',
    native: 'cinmaonline://auth/callback',
    preferLocalhost: true,
  });
  if (/^https?:\/\/localhost/i.test(redirectTo)) {
    throw new Error('OAuth redirect misconfigured: web localhost redirect is not allowed for native login.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('No auth URL returned');

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') {
    throw new Error(`Google auth ${res.type}`);
  }

  const { url } = res;
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) throw new Error(errorCode);

  if (params.error) {
    throw new Error(params.error_description || 'Authentication failed');
  }

  if (params.access_token && params.refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (sessionError) throw sessionError;
    return;
  }
  throw new Error('Google auth completed without session tokens.');
};

export const signUp = async (email: string, password: string): Promise<{ session: AuthSession | null; needsEmailVerification: boolean }> => {
  assertSupabaseConfigured();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  const session = mapSession(data.session);
  return {
    session,
    needsEmailVerification: !data.session,
  };
};

export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: AuthSession | null) => void
) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, mapSession(session));
  });
};
