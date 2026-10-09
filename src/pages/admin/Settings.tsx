import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import type { StoreSettings as BaseSettings } from "../../types";

type StoreSettings = BaseSettings & {
  email?: string | null;
  address?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  footer_about_bn?: string | null;
  footer_about_en?: string | null;
  footer_links?: { label: string; url: string }[] | null;
};

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
        email: settings.email?.trim() || null,
        address: settings.address?.trim() || null,
        facebook_url: settings.facebook_url?.trim() || null,
        youtube_url: settings.youtube_url?.trim() || null,
        instagram_url: settings.instagram_url?.trim() || null,
        footer_about_bn: settings.footer_about_bn?.trim() || null,
        footer_about_en: settings.footer_about_en?.trim() || null,
        footer_links: (settings.footer_links ?? []).filter((l) => l.label.trim() && l.url.trim()),
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

      <div className="text-xs font-bold text-mute uppercase mt-2 mb-2">ফুটার / Footer</div>
      <Field label="Email">
        <input value={settings.email ?? ""} onChange={(e) => setSettings({ ...settings, email: e.target.value })} placeholder="support@example.com" className="input" />
      </Field>
      <Field label="ঠিকানা / Address">
        <input value={settings.address ?? ""} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="input" />
      </Field>
      <Field label="Facebook লিংক">
        <input value={settings.facebook_url ?? ""} onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })} placeholder="https://facebook.com/..." className="input" />
      </Field>
      <Field label="YouTube লিংক">
        <input value={settings.youtube_url ?? ""} onChange={(e) => setSettings({ ...settings, youtube_url: e.target.value })} placeholder="https://youtube.com/..." className="input" />
      </Field>
      <Field label="Instagram লিংক">
        <input value={settings.instagram_url ?? ""} onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })} placeholder="https://instagram.com/..." className="input" />
      </Field>
      <Field label="দোকানের বর্ণনা (বাংলা)">
        <textarea value={settings.footer_about_bn ?? ""} onChange={(e) => setSettings({ ...settings, footer_about_bn: e.target.value })} rows={2} className="input resize-none" />
      </Field>
      <Field label="Shop description (English)">
        <textarea value={settings.footer_about_en ?? ""} onChange={(e) => setSettings({ ...settings, footer_about_en: e.target.value })} rows={2} className="input resize-none" />
      </Field>

      <div className="text-xs font-bold text-mute uppercase mt-2 mb-1">ফুটারের পেইজ লিংক</div>
      <div className="text-[11px] text-mute mb-2">
        সাইটের ভেতরের পেইজ হলে /categories এভাবে লিখুন। বাইরের লিংক হলে https:// দিয়ে পুরো লিংক দিন। চাপলে সরাসরি ওই পেইজে যাবে।
      </div>
      <div className="space-y-2 mb-4">
        {(settings.footer_links ?? []).map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={l.label}
              onChange={(e) => {
                const next = [...(settings.footer_links ?? [])];
                next[i] = { ...next[i], label: e.target.value };
                setSettings({ ...settings, footer_links: next });
              }}
              placeholder="নাম"
              className="input flex-1 min-w-0"
            />
            <input
              value={l.url}
              onChange={(e) => {
                const next = [...(settings.footer_links ?? [])];
                next[i] = { ...next[i], url: e.target.value };
                setSettings({ ...settings, footer_links: next });
              }}
              placeholder="/page বা https://..."
              className="input flex-1 min-w-0"
            />
            <button
              type="button"
              onClick={() =>
                setSettings({ ...settings, footer_links: (settings.footer_links ?? []).filter((_, idx) => idx !== i) })
              }
              className="press text-red-600 font-bold text-lg px-1"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSettings({ ...settings, footer_links: [...(settings.footer_links ?? []), { label: "", url: "" }] })}
          className="press w-full bg-teal-tint text-teal-dark text-sm font-bold py-2.5 rounded-xl"
        >
          + নতুন লিংক যোগ করুন
        </button>
      </div>

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
