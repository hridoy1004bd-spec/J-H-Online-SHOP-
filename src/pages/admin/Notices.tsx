import React, { useEffect, useState } from "react";
import { Megaphone, Trash2, Check, X, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";

interface Notice {
  id: string;
  text_bn: string;
  text_en: string;
  sort_order: number;
  is_active: boolean;
}

export default function Notices() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [textBn, setTextBn] = useState("");
  const [textEn, setTextEn] = useState("");
  const [saving, setSaving] = useState(false);

  const L = (bn: string, en: string) => (lang === "en" ? en : bn);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("notices").select("*").order("sort_order", { ascending: true });
    setNotices((data as Notice[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addNotice() {
    if (!textBn.trim()) return showToast(L("বাংলা টেক্সট লিখুন", "Enter Bangla text"), "error");
    setSaving(true);
    const nextOrder = notices.length ? Math.max(...notices.map((n) => n.sort_order)) + 1 : 1;
    const { error } = await supabase.from("notices").insert({
      text_bn: textBn.trim(),
      text_en: textEn.trim() || textBn.trim(),
      sort_order: nextOrder,
      is_active: true
    });
    setSaving(false);
    if (error) return showToast(error.message, "error");
    setTextBn("");
    setTextEn("");
    showToast(L("নোটিশ যোগ হয়েছে", "Notice added"), "success");
    load();
  }

  async function toggleActive(n: Notice) {
    await supabase.from("notices").update({ is_active: !n.is_active }).eq("id", n.id);
    load();
  }

  async function remove(n: Notice) {
    if (!confirm(L("এই নোটিশট মুছে ফেলতে চান?", "Delete this notice?"))) return;
    await supabase.from("notices").delete().eq("id", n.id);
    load();
  }

  async function move(n: Notice, dir: -1 | 1) {
    const idx = notices.findIndex((x) => x.id === n.id);
    const swapWith = notices[idx + dir];
    if (!swapWith) return;
    await supabase.from("notices").update({ sort_order: swapWith.sort_order }).eq("id", n.id);
    await supabase.from("notices").update({ sort_order: n.sort_order }).eq("id", swapWith.id);
    load();
  }

  return (
    <div>
      <h1 className="font-extrabold text-lg mb-4">{L("নোটিশ / হেডলাইন ম্যানেজমেন্ট", "Notice / Headline Management")}</h1>

      <div className="bg-white border border-border rounded-2xl p-4 mb-6 space-y-3">
        <div className="text-xs font-bold text-mute uppercase">{L("নতুন নোটিশ যোগ করুন", "Add New Notice")}</div>
        <textarea
          value={textBn}
          onChange={(e) => setTextBn(e.target.value)}
          placeholder={L("বাংলা টেক্সট", "Bangla text")}
          className="input min-h-[60px]"
        />
        <textarea
          value={textEn}
          onChange={(e) => setTextEn(e.target.value)}
          placeholder={L("ইংরেজি টেক্সট (ঐচ্ছিক)", "English text (optional)")}
          className="input min-h-[60px]"
        />
        <button
          onClick={addNotice}
          disabled={saving}
          className="press w-full flex items-center justify-center gap-2 bg-teal text-white text-sm font-bold py-3 rounded-xl disabled:opacity-60"
        >
          <Plus size={16} /> {saving ? L("যোগ হচ্ছে...", "Adding...") : L("যোগ করুন", "Add")}
        </button>
      </div>

      {loading ? (
        <div className="text-mute text-sm">{L("লোড হচ্ছে...", "Loading...")}</div>
      ) : notices.length === 0 ? (
        <div className="text-mute text-sm flex items-center gap-2">
          <Megaphone size={16} /> {L("কোনো নোটিশ নেই", "No notices yet")}
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n, i) => (
            <div key={n.id} className="bg-white border border-border rounded-2xl p-3">
              <div className="text-sm font-semibold mb-2">{lang === "en" ? n.text_en : n.text_bn}</div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button onClick={() => move(n, -1)} disabled={i === 0} className="text-mute disabled:opacity-30 text-xs">▲</button>
                  <button onClick={() => move(n, 1)} disabled={i === notices.length - 1} className="text-mute disabled:opacity-30 text-xs">▼</button>
                </div>
                <button
                  onClick={() => toggleActive(n)}
                  className={`press text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${
                    n.is_active ? "bg-teal-tint text-teal-dark" : "bg-[#F1F1F1] text-mute"
                  }`}
                >
                  {n.is_active ? <Check size={13} /> : <X size={13} />}
                  {n.is_active ? L("সক্রিয়", "Active") : L("নিষ্ক্রিয়", "Inactive")}
                </button>
                <button onClick={() => remove(n)} className="press text-red-600">
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
