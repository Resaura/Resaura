import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database';

const WEB_REDIRECT_AUTH = 'https://resaura.github.io/resaura-deeplink/auth/';
const REMEMBER_KEY = 'remember_me';
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
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
        const pref = await AsyncStorage.getItem(REMEMBER_KEY);
        if (pref === '0') {
          setRememberMe(false);
          try { await supabase.auth.signOut(); } catch {}
        }

        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session ?? null);

        const { data: userData } = await supabase.auth.getUser();
        const authUser = userData.user ?? null;
        const confirmed = checkEmailConfirmed(authUser);

        if (sessionData.session?.user && confirmed) {
          try {
            const profile = await loadUserProfileWithRetry(sessionData.session.user.id);
            setUser(profile);
          } catch (e) {
            console.warn('[auth] loadUserProfile failed:', e);
            setUser(null);
          } finally {
            setLoading(false);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (e) {
        console.warn('[auth] boot failed:', e);
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession ?? null);
        const { data: userData } = await supabase.auth.getUser();
        const authUser = userData.user ?? null;
        const confirmed = checkEmailConfirmed(authUser);

        if (nextSession?.user && confirmed) {
          try {
            const profile = await loadUserProfileWithRetry(nextSession.user.id);
            setUser(profile);
          } catch (e) {
            console.warn('[auth] loadUserProfile failed:', e);
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
    email = email.trim();

    // 1) Authentification
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // 2) Préférence
    try { await AsyncStorage.setItem(REMEMBER_KEY, rememberMe ? '1' : '0'); } catch {}

    // 3) Attendre la session (jusqu’à 3s)
    let s: Session | null = null;
    for (let i = 0; i < 6; i++) {
      const { data } = await supabase.auth.getSession();
      s = data.session ?? null;
      if (s) break;
      await delay(500);
    }
    if (!s) {
      const e: any = new Error('SESSION_NOT_READY');
      e.code = 'SESSION_NOT_READY';
      throw e;
    }

    // 4) Vérif email confirmé
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;

    if (!checkEmailConfirmed(userData.user ?? null)) {
      await supabase.auth.signOut();
      const e: any = new Error('EMAIL_NOT_CONFIRMED');
      e.code = 'EMAIL_NOT_CONFIRMED';
      throw e;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    _firstName: string,
    _lastName: string,
    _phone: string,
    _companyName: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${WEB_REDIRECT_AUTH}?type=signup` },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Inscription réussie, mais aucun utilisateur retourné.');
    setRequiresEmailConfirm(true);
    setUser(null);
    setLoading(false);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setRequiresEmailConfirm(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${WEB_REDIRECT_AUTH}?type=recovery`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      session, user, loading, requiresEmailConfirm,
      rememberMe, setRememberMe, signIn, signUp, signOut, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
