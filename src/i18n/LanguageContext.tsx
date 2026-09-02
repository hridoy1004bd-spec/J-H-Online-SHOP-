import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations, TranslationKey } from "./translations";
import { Lang } from "../types";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  /** Pick the right field off a bilingual DB row, e.g. pick(product, "name") -> name_en/name_bn */
  pick: (row: Record<string, any>, field: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const STORAGE_KEY = "jh_shop_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "en" || saved === "bn" ? saved : "bn";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang: setLangState,
      t: (key) => translations[lang][key] ?? translations.en[key] ?? String(key),
      pick: (row, field) => row?.[`${field}_${lang}`] ?? row?.[`${field}_en`] ?? ""
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
