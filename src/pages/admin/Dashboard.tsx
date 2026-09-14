import React, { useEffect, useState } from "react";
import { Package, Boxes, Users2, ClipboardList, Clock, TrendingUp, Wallet, CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { money, formatDate } from "../../utils/format";
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

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_mobile: string | null;
  total: number;
  payment_method: string;
  payment_reference: string | null;
  status: string;
  created_at: string;
}

function isPaid(order: OrderRow): boolean {
  if (order.payment_method === "wallet") return true;
  return !!order.payment_reference && order.payment_reference.trim().length > 0 && order.payment_reference !== "WALLET";
}

export default function Dashboard() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayOrders, setTodayOrders] = useState<OrderRow[]>([]);
  const [pendingOrders, setPendingOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ count: totalProducts }, { count: activeProducts }, { count: totalCustomers }, { count: totalOrders }, { count: pendingCount }] =
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
        pendingOrders: pendingCount ?? 0,
        todaySales,
        monthlySales,
        totalSales
      });

      const { data: todayList } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_mobile, total, payment_method, payment_reference, status, created_at")
        .gte("created_at", startOfToday.toISOString())
        .order("created_at", { ascending: false });
      setTodayOrders((todayList as OrderRow[]) ?? []);

      const { data: pendingList } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_mobile, total, payment_method, payment_reference, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      setPendingOrders((pendingList as OrderRow[]) ?? []);

      setOrdersLoading(false);
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

  const todayPaidTotal = todayOrders.filter(isPaid).reduce((s, o) => s + Number(o.total), 0);
  const todayUnpaidTotal = todayOrders.filter((o) => !isPaid(o)).reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="pb-10">
      <h1 className="font-extrabold text-lg mb-4">{t("dashboard")}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
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

      {/* Today's Orders */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-extrabold text-sm">
            {lang === "en" ? "Today's Orders" : "আজকের অর্ডার"} ({todayOrders.length})
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-teal-tint rounded-xl p-2.5">
            <div className="text-[11px] font-bold text-teal-dark/70 mb-0.5">
              {lang === "en" ? "Paid" : "পেমেন্ট হয়েছে"}
            </div>
            <div className="text-sm font-extrabold text-teal-dark">{money(todayPaidTotal)}</div>
          </div>
          <div className="bg-red-50 rounded-xl p-2.5">
            <div className="text-[11px] font-bold text-red-600/70 mb-0.5">
              {lang === "en" ? "Unpaid" : "পেমেন্ট বাকি"}
            </div>
            <div className="text-sm font-extrabold text-red-600">{money(todayUnpaidTotal)}</div>
          </div>
        </div>

        {ordersLoading ? (
          <LineSkeleton className="h-16 w-full" />
        ) : todayOrders.length === 0 ? (
          <div className="text-sm text-mute text-center py-6">
            {lang === "en" ? "No orders today yet" : "আজ এখনো কোনো অর্ডার নেই"}
          </div>
        ) : (
          <div className="space-y-2">
            {todayOrders.map((o) => (
              <OrderCard key={o.id} order={o} lang={lang} />
            ))}
          </div>
        )}
      </div>

      {/* Pending Orders */}
      <div>
        <h2 className="font-extrabold text-sm mb-2">
          {lang === "en" ? "Pending Orders" : "পেন্ডিং অর্ডার"} ({pendingOrders.length})
        </h2>
        {ordersLoading ? (
          <LineSkeleton className="h-16 w-full" />
        ) : pendingOrders.length === 0 ? (
          <div className="text-sm text-mute text-center py-6">
            {lang === "en" ? "No pending orders" : "কোনো পেন্ডিং অর্ডার নেই"}
          </div>
        ) : (
          <div className="space-y-2">
            {pendingOrders.map((o) => (
              <OrderCard key={o.id} order={o} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, lang }: { order: OrderRow; lang: string }) {
  const paid = isPaid(order);
  return (
    <div className="bg-white border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold">{order.order_number}</span>
        <span
          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            paid ? "bg-teal-tint text-teal-dark" : "bg-red-50 text-red-600"
          }`}
        >
          {paid ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
          {paid ? (lang === "en" ? "Paid" : "পেমেন্ট হয়েছে") : lang === "en" ? "Unpaid" : "বাকি"}
        </span>
      </div>
      <div className="text-xs text-mute mb-1.5">
        {order.customer_name ?? "-"} · {order.customer_mobile ?? "-"}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-mute capitalize">
          {order.payment_method} · {order.status} · {formatDate(order.created_at, lang)}
        </span>
        <span className="text-sm font-extrabold text-teal-dark">{money(order.total)}</span>
      </div>
    </div>
  );
}
