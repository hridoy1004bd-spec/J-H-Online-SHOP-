import React, { useEffect, useState } from "react";
import { Users2, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { EmptyState } from "../../components/EmptyState";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import { money, formatDate } from "../../utils/format";

interface CustomerRow {
  id: string;
  name: string;
  mobile: string;
  created_at: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
}

export default function Customers() {
  const { t, lang } = useLanguage();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      const { data: customers } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      const { data: orders } = await supabase.from("orders").select("customer_id, total, created_at").neq("status", "cancelled");

      const merged: CustomerRow[] = (customers ?? []).map((c) => {
        const custOrders = (orders ?? []).filter((o) => o.customer_id === c.id);
        const lastOrder = custOrders.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
        return {
          id: c.id,
          name: c.name,
          mobile: c.mobile,
          created_at: c.created_at,
          totalOrders: custOrders.length,
          totalSpent: custOrders.reduce((s, o) => s + Number(o.total), 0),
          lastOrderDate: lastOrder?.created_at ?? null
        };
      });
      setRows(merged);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = rows.filter(
    (r) => r.name.toLowerCase().includes(query.toLowerCase()) || r.mobile.includes(query)
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <LineSkeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-extrabold text-lg mb-3">{t("customers")}</h1>
      <div className="flex items-center bg-white border border-border rounded-xl px-3 py-2.5 mb-4">
        <Search size={15} className="text-mute" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPh")}
          className="flex-1 outline-none text-sm ml-2 bg-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users2} title={t("totalCustomers")} />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white border border-border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{r.name}</div>
                  <div className="text-xs text-mute">{r.mobile}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-teal-dark">{money(r.totalSpent)}</div>
                  <div className="text-[11px] text-mute">{r.totalOrders} {t("totalOrders")}</div>
                </div>
              </div>
              {r.lastOrderDate && (
                <div className="text-[11px] text-mute mt-1.5 border-t border-border pt-1.5">
                  {formatDate(r.lastOrderDate, lang)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
