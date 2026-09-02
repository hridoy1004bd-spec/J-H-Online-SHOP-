import React, { useEffect, useState } from "react";
import { Package, CircleCheck, Clock, Truck, XCircle, Boxes } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { orderService } from "../../services/orderService";
import { EmptyState } from "../../components/EmptyState";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import { money, formatDate } from "../../utils/format";
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

            <div className="mt-3 space-y-1 border-t border-border pt-2">
              {order.order_items?.slice(0, 3).map((item) => (
                <div key={item.id} className="text-xs text-ink/70 flex justify-between">
                  <span className="truncate pr-2">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="shrink-0">{money(item.line_total)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
