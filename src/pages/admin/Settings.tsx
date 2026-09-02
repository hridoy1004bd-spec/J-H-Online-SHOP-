import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import type { StoreSettings } from "../../types";

export default function Settings() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        setSettings(data as StoreSettings);
        setLoading(false);
      });
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("store_settings")
      .update({
        store_name: settings.store_name,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        delivery_charge_inside_dhaka: settings.delivery_charge_inside_dhaka,
        delivery_charge_outside_dhaka: settings.delivery_charge_outside_dhaka,
        cod_enabled: settings.cod_enabled
      })
      .eq("id", 1);
    setSaving(false);
    if (error) return showToast(error.message, "error");
    showToast(t("save") + " ✓");
  }

  if (loading || !settings) return <LineSkeleton className="h-64 w-full" />;

  return (
    <div className="max-w-lg">
      <h1 className="font-extrabold text-lg mb-4">{t("storeSettings")}</h1>

      {settings.dev_otp_mode && (
        <div className="flex items-start gap-2 bg-orange-tint text-orange rounded-xl p-3 mb-5 text-xs font-semibold">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          {t("devOtpWarning")}
        </div>
      )}

      <Field label={t("storeName")}>
        <input
          value={settings.store_name}
          onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("callUs")}>
        <input value={settings.phone ?? ""} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="input" />
      </Field>
      <Field label={t("whatsapp")}>
        <input value={settings.whatsapp ?? ""} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} className="input" />
      </Field>

      <div className="text-xs font-bold text-mute uppercase mt-2 mb-2">{t("deliveryCharges")}</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("insideDhaka")}>
          <input
            type="number"
            value={settings.delivery_charge_inside_dhaka}
            onChange={(e) => setSettings({ ...settings, delivery_charge_inside_dhaka: Number(e.target.value) })}
            className="input"
          />
        </Field>
        <Field label={t("outsideDhaka")}>
          <input
            type="number"
            value={settings.delivery_charge_outside_dhaka}
            onChange={(e) => setSettings({ ...settings, delivery_charge_outside_dhaka: Number(e.target.value) })}
            className="input"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 my-4">
        <input
          type="checkbox"
          checked={settings.cod_enabled}
          onChange={(e) => setSettings({ ...settings, cod_enabled: e.target.checked })}
        />
        <span className="text-sm font-semibold">{t("cod")}</span>
      </label>

      <button onClick={save} disabled={saving} className="press w-full bg-teal text-white font-bold text-sm py-3.5 rounded-xl disabled:opacity-60">
        {saving ? t("loading") : t("save")}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-bold text-mute mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
