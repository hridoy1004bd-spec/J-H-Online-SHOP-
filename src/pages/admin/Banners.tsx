import React, { useEffect, useState } from "react";
import { Image as ImageIcon, Trash2, Plus, Upload, Check, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function Banners() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const L = (bn: string, en: string) => (lang === "en" ? en : bn);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("banners").select("*").order("sort_order", { ascending: true });
    setBanners((data as Banner[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(path);
      const nextOrder = banners.length ? Math.max(...banners.map((b) => b.sort_order)) + 1 : 1;
      const { error: insErr } = await supabase.from("banners").insert({
        image_url: pub.publicUrl,
        link_url: linkUrl.trim() || null,
        sort_order: nextOrder,
        is_active: true
      });
      if (insErr) throw insErr;
      setLinkUrl("");
      showToast(L("ব্যানার যোগ হয়েছে", "Banner added"), "success");
      load();
    } catch (err: any) {
      showToast(err.message || L("আপলোড ব্যর্থ হয়েছে", "Upload failed"), "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function toggleActive(b: Banner) {
    await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
    load();
  }

  async function remove(b: Banner) {
    if (!confirm(L("এই ব্যানারটি মুছে ফেলতে চন?", "Delete this banner?"))) return;
    await supabase.from("banners").delete().eq("id", b.id);
    load();
  }

  async function move(b: Banner, dir: -1 | 1) {
    const idx = banners.findIndex((x) => x.id === b.id);
    const swapWith = banners[idx + dir];
    if (!swapWith) return;
    await supabase.from("banners").update({ sort_order: swapWith.sort_order }).eq("id", b.id);
    await supabase.from("banners").update({ sort_order: b.sort_order }).eq("id", swapWith.id);
    load();
  }

  return (
    <div>
      <h1 className="font-extrabold text-lg mb-4">{L("ব্যানার ম্যানেজমেন্ট", "Banner Management")}</h1>

      <div className="bg-white border border-border rounded-2xl p-4 mb-6">
        <div className="text-xs font-bold text-mute uppercase mb-2">{L("নতুন ব্যানার যোগ করুন", "Add New Banner")}</div>
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder={L("লিংক (ঐচ্ছিক) — যেমন /categories", "Link (optional) — e.g. /categories")}
          className="input mb-3"
        />
        <label className="press flex items-center justify-center gap-2 bg-teal text-white text-sm font-bold py-3 rounded-xl cursor-pointer disabled:opacity-60">
          <Upload size={16} />
          {uploading ? L("আপলোড হচ্ছে...", "Uploading...") : L("ছবি বেছে নিয়ে আপলোড করুন", "Choose Image & Upload")}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <div className="text-[11px] text-mute mt-2">
          {L("সাইজ: প্রশস্ত ছবি (16:9) ভালো দেখাবে, সর্বোচ্চ ৩MB", "Recommended: wide image (16:9), max 3MB")}
        </div>
      </div>

      {loading ? (
        <div className="text-mute text-sm">{L("লোড হচ্ছে...", "Loading...")}</div>
      ) : banners.length === 0 ? (
        <div className="text-mute text-sm flex items-center gap-2">
          <ImageIcon size={16} /> {L("কোনো ব্যানার নেই", "No banners yet")}
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b, i) => (
            <div key={b.id} className="bg-white border border-border rounded-2xl overflow-hidden">
              <img src={b.image_url} alt="" className="w-full aspect-[16/9] object-cover" />
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <button onClick={() => move(b, -1)} disabled={i === 0} className="text-mute disabled:opacity-30 text-xs">▲</button>
                  <button onClick={() => move(b, 1)} disabled={i === banners.length - 1} className="text-mute disabled:opacity-30 text-xs">▼</button>
                </div>
                <div className="flex-1 min-w-0 text-xs text-mute truncate">{b.link_url || L("কোনো লিংক নেই", "No link")}</div>
                <button
                  onClick={() => toggleActive(b)}
                  className={`press text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${
                    b.is_active ? "bg-teal-tint text-teal-dark" : "bg-[#F1F1F1] text-mute"
                  }`}
                >
                  {b.is_active ? <Check size={13} /> : <X size={13} />}
                  {b.is_active ? L("সক্রিয়", "Active") : L("নিষ্ক্রিয়", "Inactive")}
                </button>
                <button onClick={() => remove(b)} className="press text-red-600">
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
