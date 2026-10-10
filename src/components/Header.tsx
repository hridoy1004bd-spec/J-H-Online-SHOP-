import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Wallet, Menu, X, Eye, EyeOff, Globe } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { supabase } from "../lib/supabase";

export default function Header() {
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [storeName, setStoreName] = useState("J H Online SHOP");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("store_settings")
      .select("store_name, logo_url")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (!active || !data) return;
        if (data.store_name) setStoreName(data.store_name);
        if (data.logo_url) setLogoUrl(data.logo_url);
      });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (active && data) setWalletBalance(Number(data.balance));
        });
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setMenuOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-teal text-white overflow-visible">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1">
          <div className="w-11 h-11 rounded-full bg-white ring-2 ring-white/40 shadow-md flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag size={20} className="text-teal" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-[15px] leading-tight tracking-wide text-white drop-shadow-sm line-clamp-2">
              {storeName || t("appName")}
            </div>
            <div className="mt-0.5 h-0.5 w-8 rounded-full bg-orange" />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="press flex items-center gap-1 bg-white/15 border border-white/25 rounded-full px-2.5 py-1.5 text-[11px] font-extrabold"
            aria-label="Language"
          >
            <Globe size={13} />
            {lang === "bn" ? "EN" : "বাংলা"}
          </button>

          {walletBalance !== null && (
            <button
              onClick={() => setShowBalance((v) => !v)}
              className="press flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 bg-gradient-to-r from-orange to-[#FFA24C] shadow-md ring-1 ring-white/30"
              aria-label="Wallet"
            >
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                <Wallet size={13} className="text-orange" />
              </span>
              <span className="text-[12px] font-extrabold text-white leading-none">
                {showBalance ? `৳${walletBalance}` : "৳ ●●●"}
              </span>
              {showBalance ? <EyeOff size={12} className="text-white/90" /> : <Eye size={12} className="text-white/90" />}
            </button>
          )}

          <button onClick={() => setMenuOpen((v) => !v)} className="press" aria-label="Menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div ref={panelRef} className="absolute top-full left-0 right-0 bg-white text-ink shadow-lg border-b border-border px-4 py-4 space-y-3 z-50">
          <form onSubmit={submitSearch} className="flex items-center bg-teal-tint rounded-full px-3 py-2.5">
            <Search size={16} className="shrink-0 text-mute" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPh")}
              className="bg-transparent outline-none text-sm flex-1 min-w-0 ml-2"
            />
          </form>
          {/* নতুন ফিচার পরে এই মেনুতে যোগ হবে */}
        </div>
      )}
    </header>
  );
}
