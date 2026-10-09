import React, { useEffect, useState } from "react";
import { Upload, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { uploadService } from "../../services/uploadService";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";

interface MethodRow {
  key: string;
  label_en: string;
  label_bn: string;
  number: string | null;
  note_en: string | null;
  note_bn: string | null;
  qr_url: string | null;
  color: string | null;
  is_enabled: boolean;
  sort_order: number;
}

export default function PaymentSettings() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const [rows, setRows] = useState<MethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("payment_methods").select("*").order("sort_order");
    setRows((data as MethodRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function patch(key: string, p: Partial<MethodRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  async function uploadQr(key: string, file: File | undefined) {
    if (!file) return;
    try {
      const { url } = await uploadService.uploadProductImage(file, "payment");
      patch(key, { qr_url: url });
      showToast(lang === "en" ? "QR added — press Save" : "QR যোগ হয়েছে — সেভ চাপুন", "success");
    } catch (e: any) {
      showToast(e.message || t("error"), "error");
    }
  }

  async function save(row: MethodRow) {
    setSavingKey(row.key);
    const { error } = await supabase
      .from("payment_methods")
      .update({
        number: row.number?.trim() || null,
        note_en: row.note_en?.trim() || null,
        note_bn: row.note_bn?.trim() || null,
        qr_url: row.qr_url?.trim() || null,
        is_enabled: row.is_enabled,
        updated_at: new Date().toISOString()
      })
      .eq("key", row.key);
    setSavingKey(null);
    if (error) return showToast(error.message, "error");
    showToast(t("save") + " ✓", "success");
  }

  return (
    <div className="max-w-lg pb-10">
      <h1 className="font-extrabold text-lg mb-1">{t("paymentSettings")}</h1>
      <p className="text-xs text-mute mb-4">
        {lang === "en"
          ? "Cash on Delivery and Wallet are always available. For the others, set the number and QR code, switch ON, then Save."
          : "ক্যাশ অন ডেলিভারি ও ওয়ালেট সবসময় চালু থাকে। বাকিগুলোর নম্বর ও QR কোড দিন, চালু (ON) করুন, তারপর সেভ চাপুন।"}
      </p>

      {loading ? (
        <div className="text-sm text-mute">{t("loading")}</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                {r.is_enabled ? <CheckCircle2 className="text-teal" size={18} /> : <Circle className="text-gray-300" size={18} />}
                <div className="flex-1 font-bold text-sm" style={{ color: r.color ?? undefined }}>
                  {lang === "bn" ? r.label_bn : r.label_en}
                </div>
                <button
                  onClick={() => patch(r.key, { is_enabled: !r.is_enabled })}
                  className={`press text-[11px] font-bold px-3 py-1.5 rounded-full ${
                    r.is_enabled ? "bg-teal text-white" : "bg-gray-100 text-mute"
                  }`}
                >
                  {r.is_enabled ? "ON" : "OFF"}
                </button>
              </div>

              <label className="text-xs font-bold text-mute mb-1 block">{lang === "en" ? "Number / Account" : "নম্বর / অ্যাকাউন্ট"}</label>
              <input
                value={r.number ?? ""}
                onChange={(e) => patch(r.key, { number: e.target.value })}
                placeholder="01XXXXXXXXX"
                className="input mb-3"
              />

              <label className="text-xs font-bold text-mute mb-1 block">{lang === "en" ? "Instruction (optional)" : "নির্দেশনা (ঐচ্ছিক)"}</label>
              <input
                value={(lang === "bn" ? r.note_bn : r.note_en) ?? ""}
                onChange={(e) => patch(r.key, lang === "bn" ? { note_bn: e.target.value } : { note_en: e.target.value })}
                placeholder={lang === "en" ? "e.g. Use Send Money" : "যেমন: Send Money করুন"}
                className="input mb-3"
              />

              <label className="text-xs font-bold text-mute mb-1 block">QR {lang === "en" ? "Code" : "কোড"}</label>
              <div className="flex items-center gap-2 mb-3">
                {r.qr_url ? (
                  <img src={r.qr_url} alt="QR" className="w-16 h-16 rounded-lg object-contain border border-border bg-white shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-teal-tint shrink-0" />
                )}
                <input
                  value={r.qr_url ?? ""}
                  onChange={(e) => patch(r.key, { qr_url: e.target.value })}
                  placeholder="QR image URL"
                  className="input flex-1 min-w-0 text-xs"
                />
                <label className="press bg-teal-tint text-teal-dark rounded-lg p-2.5 cursor-pointer shrink-0">
                  <Upload size={15} />
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => uploadQr(r.key, e.target.files?.[0])} />
                </label>
              </div>

              <button
                onClick={() => save(r)}
                disabled={savingKey === r.key}
                className="press w-full bg-teal text-white font-bold text-sm py-2.5 rounded-xl disabled:opacity-60"
              >
                {savingKey === r.key ? t("loading") : t("save")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
