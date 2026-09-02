import React, { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { money, formatDate } from "../../utils/format";
import { EmptyState } from "../../components/EmptyState";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import type { Order, OrderStatus } from "../../types";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

const STATUS_NOTIFICATION: Record<OrderStatus, { type: string; titleEn: string; titleBn: string }> = {
  pending: { type: "order_placed", titleEn: "Order placed", titleBn: "অর্ডার সফল হয়েছে" },
  confirmed: { type: "order_confirmed", titleEn: "Order confirmed", titleBn: "অর্ডার কনফার্ম হয়েছে" },
  processing: { type: "processing", titleEn: "Order is processing", titleBn: "অর্ডার প্রসেসিং চলছে" },
  shipped: { type: "shipped", titleEn: "Order shipped", titleBn: "অর্ডার শিপড হয়েছে" },
  delivered: { type: "delivered", titleEn: "Order delivered", titleBn: "অর্ডার ডেলিভারড হয়েছে" },
  cancelled: { type: "cancelled", titleEn: "Order cancelled", titleBn: "অর্ডার বাতিল হয়েছে" },
  returned: { type: "cancelled", titleEn: "Order returned", titleBn: "অর্ডার রিটার্ন হয়েছে" }
};

export default function AdminOrders() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(order: Order, status: OrderStatus) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    if (error) return showToast(error.message, "error");

    const n = STATUS_NOTIFICATION[status];
    await supabase.from("notifications").insert({
      customer_id: order.customer_id,
      type: n.type,
      title_en: n.titleEn,
      title_bn: n.titleBn,
      body_en: `Order ${order.order_number} is now ${status}.`,
      body_bn: `অর্ডার ${order.order_number} এখন ${status}।`,
      related_order_id: order.id
    });

    showToast(t("save") + " ✓");
    load();
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <LineSkeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-extrabold text-lg mb-3">{t("orderMgmt")}</h1>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border ${
              filter === s ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
            }`}
          >
            {s === "all" ? t("all") : t((`status${s.charAt(0).toUpperCase()}${s.slice(1)}`) as any)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("noOrders")} />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold text-sm">{order.order_number}</div>
                  <div className="text-[11px] text-mute">{formatDate(order.created_at, lang)}</div>
                </div>
                <div className="font-extrabold text-teal-dark text-sm">{money(order.total)}</div>
              </div>
              <div className="text-xs text-ink/80 mb-2">
                <div>{order.customer_name} · {order.customer_mobile}</div>
                <div className="text-mute">{order.full_address}, {order.area}, {order.city}</div>
              </div>
              <div className="text-xs text-mute mb-3 space-y-0.5">
                {order.order_items?.map((it) => (
                  <div key={it.id}>
                    {it.product_name} × {it.quantity} {it.size ? `(${it.size})` : ""}
                  </div>
                ))}
              </div>
              <select
                value={order.status}
                onChange={(e) => updateStatus(order, e.target.value as OrderStatus)}
                className="input py-2"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t((`status${s.charAt(0).toUpperCase()}${s.slice(1)}`) as any)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
