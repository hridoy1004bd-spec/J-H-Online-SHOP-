import React, { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../i18n/LanguageContext";

interface Notice {
  id: string;
  text_en: string;
  text_bn: string;
}

export default function NoticeTicker() {
  const { lang } = useLanguage();
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    supabase
      .from("notices")
      .select("id, text_en, text_bn")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setNotices(data as Notice[]);
      });
  }, []);

  if (notices.length === 0) return null;

  const text = notices.map((n) => (lang === "en" ? n.text_en : n.text_bn)).join("     •     ");

  return (
    <div className="mx-4 mt-3 bg-orange-tint border border-orange/20 rounded-xl flex items-center gap-2 px-3 py-2 overflow-hidden">
      <Megaphone size={14} className="text-orange shrink-0" />
      <div className="overflow-hidden whitespace-nowrap flex-1">
        <div className="inline-block pl-full" style={{ animation: "jh-marquee 18s linear infinite" }}>
          {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}
        </div>
      </div>
      <style>{`
        @keyframes jh-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
