import React, { useEffect, useState } from "react";
import { Package, Boxes, Users2, ClipboardList, Clock, TrendingUp, Wallet, CalendarDays } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { money } from "../../utils/format";
import { LineSkeleton } from "../../components/LoadingSkeleton";

interface Stats {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  totalCustomers: number;
  totalOrders: number;
  pendingOrders: number;
  todaySales: number;
  monthlySales: number;
  totalSales: number;
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const [{ count: totalProducts }, { count: activeProducts }, { count: totalCustomers }, { count: totalOrders }, { count: pendingOrders }] =
        await Promise.all([
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("customers").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending")
        ]);

      const { data: outOfStockRows } = await supabase.from("inventory").select("product_id, quantity, reserved");
      const zeroStockProducts = new Set(
        (outOfStockRows ?? []).filter((r) => r.quantity - r.reserved <= 0).map((r) => r.product_id)
      );

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: allOrders } = await supabase.from("orders").select("total, created_at, status").neq("status", "cancelled");
      const todaySales = (allOrders ?? [])
        .filter((o) => new Date(o.created_at) >= startOfToday)
        .reduce((s, o) => s + Number(o.total), 0);
      const monthlySales = (allOrders ?? [])
        .filter((o) => new Date(o.created_at) >= startOfMonth)
        .reduce((s, o) => s + Number(o.total), 0);
      const totalSales = (allOrders ?? []).reduce((s, o) => s + Number(o.total), 0);

      setStats({
        totalProducts: totalProducts ?? 0,
        activeProducts: activeProducts ?? 0,
        outOfStock: zeroStockProducts.size,
        totalCustomers: totalCustomers ?? 0,
        totalOrders: totalOrders ?? 0,
        pendingOrders: pendingOrders ?? 0,
        todaySales,
        monthlySales,
        totalSales
      });
    }
    load();
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <LineSkeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const cards = [
    { icon: Package, label: t("totalProducts"), value: stats.totalProducts },
    { icon: Boxes, label: t("activeProducts"), value: stats.activeProducts },
    { icon: Boxes, label: t("outOfStockCount"), value: stats.outOfStock },
    { icon: ClipboardList, label: t("totalOrders"), value: stats.totalOrders },
    { icon: Clock, label: t("pendingOrders"), value: stats.pendingOrders },
    { icon: Users2, label: t("totalCustomers"), value: stats.totalCustomers },
    { icon: CalendarDays, label: t("todaySales"), value: money(stats.todaySales) },
    { icon: TrendingUp, label: t("monthlySales"), value: money(stats.monthlySales) },
    { icon: Wallet, label: t("totalSales"), value: money(stats.totalSales) }
  ];

  return (
    <div>
      <h1 className="font-extrabold text-lg mb-4">{t("dashboard")}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2 text-mute">
              <c.icon size={15} />
              <span className="text-[11px] font-semibold">{c.label}</span>
            </div>
            <div className="text-lg font-extrabold text-ink">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
