// contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database';
import { toFrenchAuthError } from '@/lib/errors';

// Passerelle web (GitHub Pages) qui renvoie vers resaura://auth/callback
const WEB_REDIRECT_AUTH = 'https://resaura.github.io/resaura-deeplink/auth/';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  requiresEmailConfirm: boolean;
  rememberMe: boolean;
  setRememberMe: (v: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    companyName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresEmailConfirm, setRequiresEmailConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const checkEmailConfirmed = (authUser: AuthUser | null) => {
    const confirmed = !!authUser?.email_confirmed_at;
    setRequiresEmailConfirm(!confirmed);
    return confirmed;
  };

  const loadUserProfile = async (userId: string) => {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data || null;
  };

  const loadUserProfileWithRetry = async (userId: string) => {
    for (let i = 0; i < 2; i++) {
      try {
        const profile = await loadUserProfile(userId);
        if (profile) return profile;
      } catch {}
      await delay(600);
    }
    return await loadUserProfile(userId);
  };

  useEffect(() => {
    (async () => {
      try {
        const pref = await AsyncStorage.getItem('remember_me');
        if (pref === '0') {
          console.log('[AUTH/init] remember_me=0 → session will only live for this run');
          setRememberMe(false);
        } else if (pref === '1') {
          setRememberMe(true);
        }

        const { data: sessionData } = await supabase.auth.getSession();
        console.log('[AUTH/init] getSession =>', !!sessionData.session);
        const currentSession = sessionData.session ?? null;
        setSession(currentSession);

        const { data: userData } = await supabase.auth.getUser();
        console.log(
          '[AUTH/init] getUser =>',
          !!userData.user,
          'confirmed=',
          !!userData.user?.email_confirmed_at
        );
        const authUser = userData.user ?? null;
        const confirmed = checkEmailConfirmed(authUser);

        if (currentSession?.user && confirmed) {
          try {
            console.log('[AUTH/init] loadUserProfileWithRetry...');
            const profile = await loadUserProfileWithRetry(currentSession.user.id);
            setUser(profile);
            console.log('[AUTH/init] profile ok');
          } catch (e) {
            console.warn('[AUTH/init] loadUserProfile failed:', e);
            setUser(null);
          } finally {
            setLoading(false);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (e) {
        console.warn('[AUTH/init] error:', e);
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        console.log('[AUTH/onAuthStateChange]', event, 'session?', !!nextSession);
        setSession(nextSession ?? null);
        const { data: userData } = await supabase.auth.getUser();
        console.log(
          '[AUTH/onAuthStateChange] getUser =>',
          !!userData.user,
          'confirmed=',
          !!userData.user?.email_confirmed_at
        );
        const authUser = userData.user ?? null;
        const confirmed = checkEmailConfirmed(authUser);

        if (nextSession?.user && confirmed) {
          try {
            const profile = await loadUserProfileWithRetry(nextSession.user.id);
            setUser(profile);
            console.log('[AUTH/onAuthStateChange] profile ok');
          } catch (e) {
            console.warn('[AUTH/onAuthStateChange] loadUserProfile failed:', e);
            setUser(null);
          } finally {
            setLoading(false);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[AUTH/signIn] start', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[AUTH/signIn] result error?', !!error, 'session?', !!data?.session);
    if (error) {
      console.log('[AUTH/signIn] supabase error:', error);
      throw new Error(toFrenchAuthError(error));
    }
    await AsyncStorage.setItem('remember_me', rememberMe ? '1' : '0');

    const { data: userData, error: getUserErr } = await supabase.auth.getUser();
    console.log(
      '[AUTH/signIn] getUser err?',
      !!getUserErr,
      'hasUser?',
      !!userData?.user,
      'confirmed=',
      !!userData?.user?.email_confirmed_at
    );
    if (!checkEmailConfirmed(userData.user ?? null)) {
      await supabase.auth.signOut();
      throw new Error('Veuillez confirmer votre adresse e-mail depuis le lien reçu.');
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    companyName: string
  ) => {
    console.log('[AUTH/signUp] start', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${WEB_REDIRECT_AUTH}?type=signup` },
    });
    console.log('[AUTH/signUp] error?', !!error, 'user?', !!data?.user);
    if (error) throw new Error(toFrenchAuthError(error));
    if (!data.user) throw new Error('Inscription réussie, mais aucun utilisateur retourné.');
    setRequiresEmailConfirm(true);
    setUser(null);
    setLoading(false);
  };

  const signOut = async () => {
    console.log('[AUTH/signOut] start');
    const { error } = await supabase.auth.signOut();
    console.log('[AUTH/signOut] error?', !!error);
    if (error) throw new Error(toFrenchAuthError(error));
    setUser(null);
    setRequiresEmailConfirm(false);
  };

  const resetPassword = async (email: string) => {
    console.log('[AUTH/resetPassword] start', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${WEB_REDIRECT_AUTH}?type=recovery`,
    });
    console.log('[AUTH/resetPassword] error?', !!error);
    if (error) throw new Error(toFrenchAuthError(error));
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        requiresEmailConfirm,
        rememberMe,
        setRememberMe,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
