import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Customer } from "../types";

interface AuthContextValue {
  session: Session | null;
  customer: Customer | null;
  isAdmin: boolean;
  loading: boolean;
  refreshCustomer: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadProfile(currentSession: Session | null) {
    if (!currentSession) {
      setCustomer(null);
      setIsAdmin(false);
      return;
    }
    const uid = currentSession.user.id;

    const { data: admin } = await supabase.from("admins").select("*").eq("id", uid).maybeSingle();
    if (admin) {
      setIsAdmin(true);
      setCustomer(null);
      return;
    }
    setIsAdmin(false);

    const { data: cust } = await supabase.from("customers").select("*").eq("auth_user_id", uid).maybeSingle();
    setCustomer(cust ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session).finally(() => setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshCustomer = async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCustomer(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ session, customer, isAdmin, loading, refreshCustomer, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
