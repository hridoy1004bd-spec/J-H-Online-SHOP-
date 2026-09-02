import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { money } from "../../utils/format";
import { LineSkeleton } from "../../components/LoadingSkeleton";

export default function Balance() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [delivered, setDelivered] = useState(0);
  const [pendingCod, setPendingCod] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("orders").select("total, status, payment_method");
      const rows = data ?? [];
      setDelivered(rows.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0));
      setPendingCod(
        rows
          .filter((o) => o.payment_method === "cod" && ["pending", "confirmed", "processing", "shipped"].includes(o.status))
          .reduce((s, o) => s + Number(o.total), 0)
      );
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LineSkeleton className="h-40 w-full" />;

  return (
    <div>
      <h1 className="font-extrabold text-lg mb-4">{t("balance")}</h1>
      <div className="grid grid-cols-1 gap-3 max-w-sm">
        <div className="bg-white border border-border rounded-xl p-4">
          <div className="text-xs text-mute mb-1">{t("deliveredOrders")} — {t("totalSales")}</div>
          <div className="text-2xl font-extrabold text-teal-dark">{money(delivered)}</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4">
          <div className="text-xs text-mute mb-1">{t("cod")} — {t("pendingOrders")}</div>
          <div className="text-2xl font-extrabold text-orange">{money(pendingCod)}</div>
        </div>
      </div>
    </div>
  );
}
