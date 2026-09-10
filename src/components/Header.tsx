import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, ShoppingCart, ShoppingBag, Wallet, Menu, X, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { useCart } from "../contexts/CartContext";
import { supabase } from "../lib/supabase";

export default function Header() {
  const { t, lang, setLang } = useLanguage();
  const { itemCount } = useCart();
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
        <div onClick={() => navigate("/")} className="flex items-center gap-1.5 cursor-pointer min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag size={18} />
            )}
          </div>
          <span className="font-extrabold text-[13.5px] leading-tight whitespace-nowrap">{storeName || t("appName")}</span>
        </div>

        <button onClick={() => setMenuOpen((v) => !v)} className="press shrink-0 relative">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
          {itemCount > 0 && !menuOpen && (
            <span className="absolute -top-1 -right-1 bg-orange text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </button>
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

          {walletBalance !== null && (
            <div className="flex items-center justify-between bg-orange-tint rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-orange" />
                <span className="text-sm font-bold">{lang === "en" ? "Wallet Balance" : "ওয়ালেট ব্যালেন্স"}</span>
              </div>
              <button
                onClick={() => setShowBalance((v) => !v)}
                className="press flex items-center gap-1.5 text-sm font-extrabold text-orange"
              >
                {showBalance ? `৳${walletBalance}` : "৳ ●●●"}
                {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          )}

          <button
            onClick={() => {
              navigate("/account");
              setMenuOpen(false);
            }}
            className="press w-full flex items-center gap-3 text-sm font-semibold py-2"
          >
            <User size={18} /> {t("account")}
          </button>

          <button
            onClick={() => {
              navigate("/cart");
              setMenuOpen(false);
            }}
            className="press w-full flex items-center gap-3 text-sm font-semibold py-2"
          >
            <ShoppingCart size={18} /> {t("cart")}
            {itemCount > 0 && (
              <span className="bg-orange text-white text-[10px] font-bold rounded-full px-2 py-0.5">{itemCount}</span>
            )}
          </button>

          <button
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="press w-full text-xs font-bold bg-teal-tint text-teal-dark rounded-full py-2.5"
          >
            {lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
          </button>
        </div>
      )}
    </header>
  );
}
