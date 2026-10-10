import React, { useEffect, useState } from "react";
import { ClipboardList, CheckCircle2, AlertTriangle, Truck } from "lucide-react";
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

const VIA_NAMES: Record<string, string> = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket", card: "Card" };

type PayKind = "wallet" | "full" | "delivery_only";

function payInfo(o: Order) {
  const total = Number(o.total);
  const kind: PayKind =
    o.payment_method === "wallet"
      ? "wallet"
      : (o.pay_kind as PayKind | null | undefined) ?? (o.payment_method === "cod" ? "delivery_only" : "full");
  const paid =
    kind === "wallet" ? total : Number(o.paid_amount ?? (kind === "delivery_only" ? o.delivery_charge : total));
  const viaKey = o.paid_via ?? (o.payment_method !== "cod" && o.payment_method !== "wallet" ? o.payment_method : null);
  const via = viaKey ? VIA_NAMES[viaKey] ?? viaKey : null;
  return { kind, paid, due: Math.max(0, total - paid), via, ref: o.payment_reference ?? null };
}

export default function AdminOrders() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [view, setView] = useState<"orders" | "charges">("orders");
  const [chargeFilter, setChargeFilter] = useState<"all" | "unverified" | "verified">("unverified");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*, order_items(*, product_variants(image_url))").order("created_at", { ascending: false });
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

  async function toggleVerified(order: Order) {
    const next = !order.charge_verified;
    const { error } = await supabase.from("orders").update({ charge_verified: next }).eq("id", order.id);
    if (error) return showToast(error.message, "error");
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, charge_verified: next } : o)));
    showToast(next ? "যাচাই হয়েছে ✓" : "যাচাই বাতিল");
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  // Delivery-charge view: every order where money was received in advance by bKash/Nagad/etc.
  const chargeOrders = orders.filter((o) => {
    if (o.status === "cancelled") return false;
    const p = payInfo(o);
    return p.kind === "delivery_only";
  });
  const chargeShown = chargeOrders.filter((o) =>
    chargeFilter === "all" ? true : chargeFilter === "verified" ? !!o.charge_verified : !o.charge_verified
  );
  const chargeTotal = chargeOrders.reduce((s, o) => s + payInfo(o).paid, 0);
  const chargeVerifiedTotal = chargeOrders.filter((o) => o.charge_verified).reduce((s, o) => s + payInfo(o).paid, 0);
  const chargeUnverifiedCount = chargeOrders.filter((o) => !o.charge_verified).length;

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

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setView("orders")}
          className={`press text-sm font-bold py-2.5 rounded-xl border ${
            view === "orders" ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
          }`}
        >
          সব অর্ডার
        </button>
        <button
          onClick={() => setView("charges")}
          className={`press text-sm font-bold py-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
            view === "charges" ? "bg-orange text-white border-orange" : "bg-white text-ink border-border"
          }`}
        >
          <Truck size={15} /> ডেলিভারি চার্জ
          {chargeUnverifiedCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${view === "charges" ? "bg-white text-orange" : "bg-orange text-white"}`}>
              {chargeUnverifiedCount}
            </span>
          )}
        </button>
      </div>

      {view === "charges" ? (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-orange-tint rounded-xl p-2.5">
              <div className="text-[10.5px] font-bold text-orange/80 mb-0.5">মোট পাঠিয়েছে</div>
              <div className="text-sm font-extrabold text-orange">{money(chargeTotal)}</div>
            </div>
            <div className="bg-teal-tint rounded-xl p-2.5">
              <div className="text-[10.5px] font-bold text-teal-dark/70 mb-0.5">যাচাই হয়েছে</div>
              <div className="text-sm font-extrabold text-teal-dark">{money(chargeVerifiedTotal)}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-2.5">
              <div className="text-[10.5px] font-bold text-red-600/70 mb-0.5">যাচাই বাকি</div>
              <div className="text-sm font-extrabold text-red-600">{chargeUnverifiedCount} টি</div>
            </div>
          </div>

          <div className="flex gap-2 pb-3">
            {(
              [
                ["unverified", "যাচাই বাকি"],
                ["verified", "যাচাই হয়েছে"],
                ["all", "সব"]
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setChargeFilter(k)}
                className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border ${
                  chargeFilter === k ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {chargeShown.length === 0 ? (
            <EmptyState icon={Truck} title="কোনো ডেলিভারি চার্জ নেই" />
          ) : (
            <div className="space-y-2">
              {chargeShown.map((o) => {
                const p = payInfo(o);
                return (
                  <div key={o.id} className="bg-white border border-border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">{o.order_number}</span>
                      <span className="text-sm font-extrabold text-orange">{money(p.paid)}</span>
                    </div>
                    <div className="text-xs text-mute mb-2">
                      {o.customer_name} · {o.customer_mobile} · {formatDate(o.created_at, lang)}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-ink/80">
                        <span className="font-bold">{p.via ?? "মাধ্যম অজানা"}</span>
                        {" · TrxID: "}
                        <span className="font-mono font-bold">{p.ref ?? "-"}</span>
                      </div>
                      <button
                        onClick={() => toggleVerified(o)}
                        className={`press shrink-0 flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full ${
                          o.charge_verified ? "bg-teal-tint text-teal-dark" : "bg-red-50 text-red-600"
                        }`}
                      >
                        {o.charge_verified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                        {o.charge_verified ? "যাচাই হয়েছে" : "যাচাই করুন"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
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
              {filtered.map((order) => {
                const p = payInfo(order);
                return (
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
                    <div className="text-xs text-mute mb-3 space-y-2">
                      {order.order_items?.map((it) => (
                        <div key={it.id} className="flex items-center gap-2">
                          {it.product_variants?.image_url ? (
                            <img src={it.product_variants.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-teal-tint shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-ink/80 font-semibold">{it.product_name} × {it.quantity}</div>
                            <div>
                              {it.size ? `${it.size}` : ""}
                              {it.size && it.color ? " · " : ""}
                              {it.color ? `${it.color}` : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      className={`rounded-xl p-3 mb-3 text-xs ${
                        p.kind === "delivery_only" ? "bg-orange-tint" : "bg-teal-tint"
                      }`}
                    >
                      <div className={`font-extrabold mb-1 ${p.kind === "delivery_only" ? "text-orange" : "text-teal-dark"}`}>
                        {p.kind === "wallet"
                          ? "ওয়ালেট থেকে পুরো টাকা পরিশোধ"
                          : p.kind === "full"
                          ? "পুরো টাকা অগ্রিম দিয়েছে"
                          : "শুধু ডেলিভারি চার্জ অগ্রিম দিয়েছে"}
                        {" · "}
                        {money(p.paid)}
                      </div>
                      {p.kind !== "wallet" && (
                        <div className="text-ink/80">
                          মাধ্যম: <span className="font-bold">{p.via ?? "অজানা"}</span>
                          {" · TrxID: "}
                          <span className="font-mono font-bold">{p.ref ?? "-"}</span>
                        </div>
                      )}
                      <div className="text-ink/80 mt-0.5">
                        ডেলিভারির সময় নেবেন: <span className="font-extrabold">{money(p.due)}</span>
                      </div>
                      {p.kind !== "wallet" && (
                        <button
                          onClick={() => toggleVerified(order)}
                          className={`press mt-2 flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full ${
                            order.charge_verified ? "bg-white text-teal-dark" : "bg-white text-red-600"
                          }`}
                        >
                          {order.charge_verified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                          {order.charge_verified ? "TrxID যাচাই হয়েছে" : "TrxID যাচাই করুন"}
                        </button>
                      )}
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
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
