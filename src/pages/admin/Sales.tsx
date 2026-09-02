import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { money } from "../../utils/format";
import { LineSkeleton } from "../../components/LoadingSkeleton";

interface DayPoint {
  date: string;
  total: number;
}

export default function Sales() {
  const { t } = useLanguage();
  const [points, setPoints] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const since = new Date();
      since.setDate(since.getDate() - 13);
      const { data } = await supabase
        .from("orders")
        .select("total, created_at")
        .neq("status", "cancelled")
        .gte("created_at", since.toISOString());

      const byDay: Record<string, number> = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        byDay[d.toISOString().slice(0, 10)] = 0;
      }
      (data ?? []).forEach((o) => {
        const key = o.created_at.slice(0, 10);
        if (key in byDay) byDay[key] += Number(o.total);
      });
      setPoints(Object.entries(byDay).map(([date, total]) => ({ date, total })));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LineSkeleton className="h-64 w-full" />;

  const max = Math.max(...points.map((p) => p.total), 1);
  const totalPeriod = points.reduce((s, p) => s + p.total, 0);

  return (
    <div>
      <h1 className="font-extrabold text-lg mb-1">{t("salesProfit")}</h1>
      <div className="text-sm text-mute mb-4">
        {t("totalSales")} ({t("newest")} 14d): <span className="font-bold text-ink">{money(totalPeriod)}</span>
      </div>

      <div className="bg-white border border-border rounded-xl p-4">
        <div className="flex items-end gap-1.5 h-40">
          {points.map((p) => (
            <div key={p.date} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full bg-teal rounded-t"
                style={{ height: `${Math.max(4, (p.total / max) * 100)}%` }}
                title={`${p.date}: ${money(p.total)}`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-mute mt-2">
          <span>{points[0]?.date.slice(5)}</span>
          <span>{points[points.length - 1]?.date.slice(5)}</span>
        </div>
      </div>
    </div>
  );
}
