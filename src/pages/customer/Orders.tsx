import React, { useEffect, useState } from "react";
import { Package, CircleCheck, Clock, Truck, XCircle, Boxes, ShoppingBag } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { orderService } from "../../services/orderService";
import { EmptyState } from "../../components/EmptyState";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import { money, formatDate } from "../../utils/format";
import { orderItemImage } from "../../utils/orderImage";
import type { Order, OrderStatus } from "../../types";

const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

const STATUS_ICON: Record<OrderStatus, any> = {
  pending: Clock,
  confirmed: CircleCheck,
  processing: Boxes,
  shipped: Truck,
  delivered: Package,
  cancelled: XCircle,
  returned: XCircle
};

export default function Orders() {
  const { customer, loading: authLoading } = useAuth();
  const { t, lang } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) {
      setLoading(false);
      return;
    }
    orderService
      .myOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [customer]);

  if (authLoading || loading) {
    return (
      <div className="p-4 space-y-3">
        <LineSkeleton className="h-24 w-full" />
        <LineSkeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!customer) {
    return <EmptyState icon={Package} title={t("notLoggedIn")} subtitle={t("notLoggedInSub")} />;
  }

  if (orders.length === 0) {
    return <EmptyState icon={Package} title={t("noOrders")} subtitle={t("noOrdersSub")} />;
  }

  return (
    <div className="px-4 pt-4 space-y-3 pb-6">
      <h1 className="font-extrabold text-lg mb-1">{t("myOrders")}</h1>
      {orders.map((order) => {
        const statusKey = `status${order.status.charAt(0).toUpperCase()}${order.status.slice(1)}` as any;
        const stepIndex = STATUS_FLOW.indexOf(order.status);
        const cancelled = order.status === "cancelled" || order.status === "returned";
        return (
          <div key={order.id} className="bg-white border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-bold text-sm">{order.order_number}</div>
                <div className="text-[11px] text-mute">{formatDate(order.created_at, lang)}</div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-teal-dark text-sm">{money(order.total)}</div>
                <div className={`text-[11px] font-bold ${cancelled ? "text-red-500" : "text-teal"}`}>{t(statusKey)}</div>
              </div>
            </div>

            {!cancelled && (
              <div className="flex items-center mt-3">
                {STATUS_FLOW.map((s, i) => {
                  const Icon = STATUS_ICON[s];
                  const reached = i <= stepIndex;
                  return (
                    <React.Fragment key={s}>
                      <div className={`flex flex-col items-center gap-1 ${reached ? "text-teal" : "text-gray-300"}`}>
                        <Icon size={16} />
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div className={`flex-1 h-0.5 ${i < stepIndex ? "bg-teal" : "bg-gray-200"}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            <div className="mt-3 space-y-2.5 border-t border-border pt-3">
              {order.order_items?.map((item) => {
                const img = orderItemImage(item);
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-teal-tint border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <ShoppingBag size={20} className="text-teal/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-ink line-clamp-2">{item.product_name}</div>
                      {(item.size || item.color) && (
                        <div className="text-[11px] text-mute mt-0.5">{[item.size, item.color].filter(Boolean).join(" · ")}</div>
                      )}
                      <div className="text-[11px] text-mute mt-0.5">
                        {item.quantity} × {money(item.unit_price ?? item.line_total)}
                      </div>
                    </div>
                    <div className="shrink-0 font-extrabold text-sm text-ink">{money(item.line_total ?? Number(item.unit_price) * item.quantity)}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 border-t border-border pt-2 space-y-1 text-xs">
              <div className="flex justify-between text-mute">
                <span>{lang === "en" ? "Subtotal" : "পণ্যের দাম"}</span>
                <span>{money(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-mute">
                <span>{lang === "en" ? "Delivery" : "ডেলিভারি চার্জ"}</span>
                <span>{Number(order.delivery_charge) === 0 ? (lang === "en" ? "Free" : "ফ্রি") : money(order.delivery_charge)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-ink pt-1">
                <span>{lang === "en" ? "Total" : "মোট"}</span>
                <span className="text-teal-dark">{money(order.total)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
