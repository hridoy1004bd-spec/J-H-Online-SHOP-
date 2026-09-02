import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";

export default function AdminLogin() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { refreshCustomer, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isAdmin) navigate("/admin");
  }, [isAdmin, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return showToast(error.message, "error");
    await refreshCustomer();
    navigate("/admin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFCFC] px-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-white border border-border rounded-2xl p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-teal-tint flex items-center justify-center mb-3">
            <ShieldCheck className="text-teal" size={22} />
          </div>
          <div className="font-extrabold text-lg">{t("adminLogin")}</div>
        </div>
        <label className="text-xs font-bold text-mute mb-1.5 block">{t("email")}</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="input mb-4" />
        <label className="text-xs font-bold text-mute mb-1.5 block">{t("password")}</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="input mb-6" />
        <button disabled={loading} className="press w-full bg-teal text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60">
          {loading ? t("loading") : t("login")}
        </button>
      </form>
    </div>
  );
}
