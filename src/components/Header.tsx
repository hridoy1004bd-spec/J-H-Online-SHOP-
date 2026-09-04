import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, ShoppingCart, ShoppingBag } from "lucide-react";
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
    return () => {
      active = false;
    };
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40 bg-teal text-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <div onClick={() => navigate("/")} className="flex items-center gap-1.5 cursor-pointer shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag size={17} />
            )}
          </div>
          <span className="font-extrabold text-sm leading-tight block">{storeName || t("appName")}</span>
        </div>

        <form onSubmit={submitSearch} className="flex-1 flex items-center bg-white/15 rounded-full px-3 py-2">
          <Search size={16} className="shrink-0 opacity-80" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPh")}
            className="bg-transparent outline-none text-sm placeholder-white/70 flex-1 min-w-0 ml-2"
          />
        </form>

        <button
          onClick={() => setLang(lang === "bn" ? "en" : "bn")}
          className="press text-[11px] font-bold bg-white/15 rounded-full px-2.5 py-1.5 shrink-0"
        >
          {lang === "bn" ? "EN" : "বাংলা"}
        </button>
        <button onClick={() => navigate("/account")} className="press shrink-0">
          <User size={20} />
        </button>
        <button onClick={() => navigate("/cart")} className="press relative shrink-0">
          <ShoppingCart size={20} />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-orange text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
