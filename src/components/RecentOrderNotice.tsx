import React, { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../i18n/LanguageContext";

interface RecentOrderCity {
  city: string;
  minutes_ago: number;
}

function timeAgoText(minutes: number, lang: "bn" | "en") {
  if (minutes < 1) return lang === "en" ? "just now" : "এইমাত্র";
  if (minutes < 60) return lang === "en" ? `${minutes} min ago` : `${minutes} মিনিট আগে`;
  const hours = Math.floor(minutes / 60);
  return lang === "en" ? `${hours}h ago` : `${hours} ঘণ্টা আগে`;
}

export default function RecentOrderNotice() {
  const { lang } = useLanguage();
  const [rows, setRows] = useState<RecentOrderCity[]>([]);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    supabase.rpc("get_recent_order_cities", { limit_count: 10 }).then(({ data }) => {
      if (data && data.length > 0) setRows(data as RecentOrderCity[]);
    });
  }, []);

  useEffect(() => {
    if (rows.length === 0) return;
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    let cycleTimer: ReturnType<typeof setInterval>;

    setVisible(true);
    hideTimer = setTimeout(() => setVisible(false), 4500);

    cycleTimer = setInterval(() => {
      setIdx((i) => (i + 1) % rows.length);
      setVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setVisible(false), 4500);
    }, 7000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearInterval(cycleTimer);
    };
  }, [rows]);

  if (rows.length === 0) return null;
  const row = rows[idx];

  return (
    <div
      className={`fixed left-3 bottom-20 z-40 max-w-[240px] bg-white shadow-lg border border-border rounded-2xl px-3 py-2.5 flex items-center gap-2 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-teal-tint flex items-center justify-center shrink-0">
        <ShoppingBag size={15} className="text-teal-dark" />
      </div>
      <div className="text-[11px] leading-snug">
        <div className="font-bold text-ink">
          {lang === "en" ? `A customer from ${row.city} just ordered` : `${row.city} থেকে একজন কাস্টমার অর্ডার করেছেন`}
        </div>
        <div className="text-mute">{timeAgoText(row.minutes_ago, lang)}</div>
      </div>
    </div>
  );
}
