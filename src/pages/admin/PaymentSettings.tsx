import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

const METHODS = [
  { key: "cod", label: "Cash on Delivery", enabled: true, note: "Active" },
  { key: "bkash", label: "bKash", enabled: false, note: "Requires BKASH_APP_KEY / BKASH_APP_SECRET" },
  { key: "nagad", label: "Nagad", enabled: false, note: "Requires NAGAD_MERCHANT_ID" },
  { key: "rocket", label: "Rocket", enabled: false, note: "Not yet configured" },
  { key: "card", label: "Card / Online Gateway", enabled: false, note: "Not yet configured" }
];

export default function PaymentSettings() {
  const { t } = useLanguage();

  return (
    <div className="max-w-lg">
      <h1 className="font-extrabold text-lg mb-1">{t("paymentSettings")}</h1>
      <p className="text-xs text-mute mb-4">
        Cash on Delivery is live today. The other methods are architected and ready — add the
        corresponding secrets as Supabase Edge Function secrets to activate each one.
      </p>
      <div className="space-y-2">
        {METHODS.map((m) => (
          <div key={m.key} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            {m.enabled ? <CheckCircle2 className="text-teal" size={18} /> : <Circle className="text-gray-300" size={18} />}
            <div className="flex-1">
              <div className="text-sm font-bold">{m.label}</div>
              <div className="text-[11px] text-mute">{m.note}</div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                m.enabled ? "bg-teal-tint text-teal-dark" : "bg-gray-100 text-mute"
              }`}
            >
              {m.enabled ? "ON" : "OFF"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
