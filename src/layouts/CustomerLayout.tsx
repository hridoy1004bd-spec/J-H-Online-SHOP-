import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import Footer from "../components/Footer";
import FloatingContact from "../components/FloatingContact";
import { supabase } from "../lib/supabase";

type Role = "loading" | "reseller" | "other";

export default function CustomerLayout() {
  const [role, setRole] = useState<Role>("loading");
  const { pathname } = useLocation();

  useEffect(() => {
    let dead = false;
    async function check() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        if (!dead) setRole("other");
        return;
      }
      const { data } = await supabase.from("telecom_resellers").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!dead) setRole(data ? "reseller" : "other");
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setTimeout(check, 0);
    });
    return () => {
      dead = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (role === "loading") return <div className="min-h-screen bg-[#f4f6fb]" />;

  // রিসেলার লগইন করলে J H Shop-এর কিছুই দেখবে না — শুধু নিজের রিসেলার অ্যাপ
  if (role === "reseller") {
    if (pathname !== "/telecom") return <Navigate to="/telecom" replace />;
    return (
      <div className="min-h-screen bg-[#f4f6fb]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFCFC]">
      <Header />
      <main className="flex-1 pb-20">
        <Outlet />
        <Footer />
      </main>
      <BottomNav />
      <FloatingContact />
    </div>
  );
}
