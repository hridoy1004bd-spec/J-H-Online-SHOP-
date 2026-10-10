import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Boxes, Users2, ClipboardList, Clock, TrendingUp, Wallet, CalendarDays, CheckCircle2, Truck } from "lucide-react";
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
  delivery_charge: number | null;
  pay_kind: string | null;
  paid_via: string | null;
  paid_amount: number | null;
  charge_verified: boolean | null;
  status: string;
  created_at: string;
}

const ORDER_COLS =
  "id, order_number, customer_name, customer_mobile, total, payment_method, payment_reference, delivery_charge, pay_kind, paid_via, paid_amount, charge_verified, status, created_at";

const VIA_NAMES: Record<string, string> = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket", card: "Card" };

// Money received in advance for this order (delivery charge only, or the full amount).
function paidAmount(order: OrderRow): number {
  const total = Number(order.total);
  if (order.payment_method === "wallet") return total;
  if (order.paid_amount != null) return Number(order.paid_amount);
  if (order.payment_method === "cod") return Number(order.delivery_charge ?? 0);
  return total;
}

function isDeliveryOnly(order: OrderRow): boolean {
  if (order.payment_method === "wallet") return false;
  return (order.pay_kind ?? (order.payment_method === "cod" ? "delivery_only" : "full")) === "delivery_only";
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
        .select(ORDER_COLS)
        .gte("created_at", startOfToday.toISOString())
        .order("created_at", { ascending: false });
      setTodayOrders((todayList as OrderRow[]) ?? []);

      const { data: pendingList } = await supabase
        .from("orders")
        .select(ORDER_COLS)
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

  const todayPaidTotal = todayOrders.reduce((s, o) => s + paidAmount(o), 0);
  const todayDueTotal = todayOrders.reduce((s, o) => s + Math.max(0, Number(o.total) - paidAmount(o)), 0);
  const todayCharges = todayOrders.filter((o) => isDeliveryOnly(o) && o.status !== "cancelled");
  const todayChargeTotal = todayCharges.reduce((s, o) => s + paidAmount(o), 0);
  const unverifiedCharges = pendingOrders.filter((o) => o.payment_method !== "wallet" && !o.charge_verified).length;

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
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-teal-tint rounded-xl p-2.5">
            <div className="text-[11px] font-bold text-teal-dark/70 mb-0.5">
              {lang === "en" ? "Received in advance" : "অগ্রিম পাওয়া গেছে"}
            </div>
            <div className="text-sm font-extrabold text-teal-dark">{money(todayPaidTotal)}</div>
          </div>
          <div className="bg-red-50 rounded-xl p-2.5">
            <div className="text-[11px] font-bold text-red-600/70 mb-0.5">
              {lang === "en" ? "To collect on delivery" : "ডেলিভারিতে পাওয়া যাবে"}
            </div>
            <div className="text-sm font-extrabold text-red-600">{money(todayDueTotal)}</div>
          </div>
        </div>
        <Link to="/admin/orders" className="press flex items-center justify-between bg-orange-tint rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-orange" />
            <div>
              <div className="text-xs font-extrabold text-orange">
                {lang === "en" ? "Delivery charges today" : "আজকের ডেলিভারি চার্জ"}: {money(todayChargeTotal)} ({todayCharges.length})
              </div>
              <div className="text-[11px] text-ink/70">
                {lang === "en" ? "Pending orders to verify" : "যাচাই বাকি পেন্ডিং অর্ডার"}: {unverifiedCharges}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-bold text-orange">{lang === "en" ? "Open" : "দেখুন"} ›</span>
        </Link>

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

function OrderCard({ order, lang }: { order: OrderRow; lang: "en" | "bn" }) {
  const total = Number(order.total);
  const paidAmt = paidAmount(order);
  const deliveryOnly = isDeliveryOnly(order);
  const full = paidAmt >= total;
  const viaKey = order.paid_via ?? (order.payment_method !== "cod" && order.payment_method !== "wallet" ? order.payment_method : null);
  const via = viaKey ? VIA_NAMES[viaKey] ?? viaKey : null;
  const noAdvance = order.pay_kind === "on_delivery";
  const badge =
    order.payment_method === "wallet"
      ? lang === "en" ? "Wallet paid" : "ওয়ালেটে পরিশোধ"
      : noAdvance
      ? lang === "en" ? "Pay on delivery" : "ডেলিভারিতে পরিশোধ"
      : full
      ? lang === "en" ? "Fully paid" : "পুরো পেমেন্ট"
      : lang === "en" ? "Delivery charge paid" : "ডেলিভারি চার্জ দেওয়া";
  return (
    <div className="bg-white border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold">{order.order_number}</span>
        <span
          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            noAdvance ? "bg-red-50 text-red-600" : deliveryOnly ? "bg-orange-tint text-orange" : "bg-teal-tint text-teal-dark"
          }`}
        >
          <CheckCircle2 size={11} />
          {badge}
        </span>
      </div>
      <div className="text-xs text-mute mb-1.5">
        {order.customer_name ?? "-"} · {order.customer_mobile ?? "-"}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-mute capitalize">
          {via ?? order.payment_method} · {order.status} · {formatDate(order.created_at, lang)}
        </span>
        <span className="text-sm font-extrabold text-teal-dark">{money(order.total)}</span>
      </div>
    </div>
  );
}
