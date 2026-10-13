import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { money, toBanglaDigits } from "../../utils/format";
import { LineSkeleton } from "../../components/LoadingSkeleton";

interface Row {
  total: number;
  created_at: string;
}
interface Pt {
  key: string;
  date: Date;
  total: number;
  count: number;
}

const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export default function Sales() {
  const { lang } = useLanguage();
  const bn = lang === "bn";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"day" | "month">("day");
  const [selected, setSelected] = useState<string | null>(null);

  const num = (v: number | string) => (bn ? toBanglaDigits(v) : String(v));
  const monthName = (d: Date) => (bn ? MONTHS_BN : MONTHS_EN)[d.getMonth()];
  const fullDay = (d: Date) => `${num(d.getDate())} ${monthName(d)} ${num(d.getFullYear())}`;
  const fullMonth = (d: Date) => `${monthName(d)} ${num(d.getFullYear())}`;

  useEffect(() => {
    async function load() {
      const now = new Date();
      const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const all: Row[] = [];
      for (let from = 0; from < 20000; from += 1000) {
        const { data } = await supabase
          .from("orders")
          .select("total, created_at")
          .neq("status", "cancelled")
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: true })
          .range(from, from + 999);
        const chunk = (data ?? []) as Row[];
        all.push(...chunk);
        if (chunk.length < 1000) break;
      }
      setRows(all);
      setLoading(false);
    }
    load();
  }, []);

  const points: Pt[] = useMemo(() => {
    const now = new Date();
    const list: Pt[] = [];
    if (mode === "day") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        list.push({ key: dayKey(d), date: d, total: 0, count: 0 });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        list.push({ key: monthKey(d), date: d, total: 0, count: 0 });
      }
    }
    const index = new Map(list.map((p, i) => [p.key, i]));
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      const i = index.get(mode === "day" ? dayKey(d) : monthKey(d));
      if (i !== undefined) {
        list[i].total += Number(r.total);
        list[i].count += 1;
      }
    });
    return list;
  }, [rows, mode]);

  const summary = useMemo(() => {
    const now = new Date();
    const today = dayKey(now);
    const thisMonth = monthKey(now);
    const year = now.getFullYear();
    const s = { today: 0, todayN: 0, month: 0, monthN: 0, year: 0, yearN: 0 };
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      const t = Number(r.total);
      if (dayKey(d) === today) {
        s.today += t;
        s.todayN++;
      }
      if (monthKey(d) === thisMonth) {
        s.month += t;
        s.monthN++;
      }
      if (d.getFullYear() === year) {
        s.year += t;
        s.yearN++;
      }
    });
    return s;
  }, [rows]);

  if (loading) return <LineSkeleton className="h-64 w-full" />;

  const max = Math.max(...points.map((p) => p.total), 1);
  const periodTotal = points.reduce((s, p) => s + p.total, 0);
  const periodCount = points.reduce((s, p) => s + p.count, 0);
  const sel = points.find((p) => p.key === selected) ?? points[points.length - 1];
  const first = points[0];
  const last = points[points.length - 1];
  const mid = points[Math.floor(points.length / 2)];
  const edgeLabel = (p: Pt) => (mode === "day" ? `${num(p.date.getDate())} ${monthName(p.date)}` : `${monthName(p.date)} ${num(p.date.getFullYear())}`);

  return (
    <div>
      <h1 className="font-extrabold text-lg mb-3">{bn ? "বিক্রি ও লাভ" : "Sales & Profit"}</h1>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          [bn ? "আজ" : "Today", summary.today, summary.todayN],
          [bn ? "এই মাস" : "This month", summary.month, summary.monthN],
          [bn ? `${num(new Date().getFullYear())} সাল` : `Year ${new Date().getFullYear()}`, summary.year, summary.yearN]
        ].map(([label, total, n]) => (
          <div key={String(label)} className="bg-white border border-border rounded-xl p-3">
            <div className="text-[10px] font-bold text-mute">{label}</div>
            <div className="font-extrabold text-[15px] text-teal-dark mt-0.5">{money(Number(total))}</div>
            <div className="text-[10px] text-mute">{num(Number(n))} {bn ? "টি অর্ডার" : "orders"}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        {([
          ["day", bn ? "দৈনিক (৩০ দিন)" : "Daily (30 days)"],
          ["month", bn ? "মাসিক (১২ মাস)" : "Monthly (12 months)"]
        ] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setSelected(null);
            }}
            className={`press px-4 py-1.5 rounded-full text-xs font-bold border ${mode === m ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="text-sm text-mute mb-3">
        {bn ? "মোট বিক্রি" : "Total sales"}: <span className="font-bold text-ink">{money(periodTotal)}</span> · {num(periodCount)} {bn ? "টি অর্ডার" : "orders"}
      </div>

      <div className="bg-white border border-border rounded-xl p-4">
        <div className="text-xs text-ink mb-3 min-h-[32px]">
          <span className="font-bold">{mode === "day" ? fullDay(sel.date) : fullMonth(sel.date)}</span>
          {": "}
          <span className="font-extrabold text-teal-dark">{money(sel.total)}</span>
          <span className="text-mute"> ({num(sel.count)} {bn ? "টি অর্ডার" : "orders"})</span>
        </div>
        <div className="flex items-end gap-[3px] h-40">
          {points.map((p) => {
            const isSel = p.key === sel.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelected(p.key)}
                className="flex-1 h-full flex flex-col justify-end"
                aria-label={`${p.key}: ${p.total}`}
              >
                <div
                  className={`w-full rounded-t ${isSel ? "bg-orange" : "bg-teal"}`}
                  style={{ height: `${p.total > 0 ? Math.max(6, (p.total / max) * 100) : 2}%`, opacity: p.total > 0 ? 1 : 0.25 }}
                />
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-mute mt-2">
          <span>{edgeLabel(first)}</span>
          <span>{edgeLabel(mid)}</span>
          <span>{edgeLabel(last)}</span>
        </div>
      </div>
      <div className="text-[11px] text-mute mt-2">{bn ? "যেকোনো বারে চাপলে ওই দিন/মাসের হিসাব দেখাবে। বাতিল অর্ডার ধরা হয়নি।" : "Tap any bar to see that day/month. Cancelled orders are excluded."}</div>
    </div>
  );
}
