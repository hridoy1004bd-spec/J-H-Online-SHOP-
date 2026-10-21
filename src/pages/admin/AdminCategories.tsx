import { autoPair } from "../../services/translateService";
import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Upload, ArrowUp, ArrowDown, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import type { Category } from "../../types";

interface Form {
  id: string | null;
  name_bn: string;
  name_en: string;
  parent_id: string;
  icon: string;
  image_url: string;
  note_bn: string;
  note_en: string;
  is_active: boolean;
}

const EMPTY: Form = { id: null, name_bn: "", name_en: "", parent_id: "", icon: "", image_url: "", note_bn: "", note_en: "", is_active: true };

function makeSlug(en: string, bn: string): string {
  const base = (en || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (base || "cat") + "-" + Math.random().toString(36).slice(2, 6);
}

export default function AdminCategories() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const L = (bn: string, en: string) => (lang === "en" ? en : bn);

  const [cats, setCats] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [allNoteBn, setAllNoteBn] = useState("");
  const [allNoteEn, setAllNoteEn] = useState("");
  const [allSaving, setAllSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("store_settings")
      .select("all_note_bn, all_note_en")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        setAllNoteBn((data as any)?.all_note_bn ?? "");
        setAllNoteEn((data as any)?.all_note_en ?? "");
      });
  }, []);

  async function saveAllNote() {
    setAllSaving(true);
    const { error } = await supabase
      .from("store_settings")
      .update({ all_note_bn: allNoteBn.trim() || null, all_note_en: allNoteEn.trim() || null })
      .eq("id", 1);
    setAllSaving(false);
    if (error) return showToast(error.message, "error");
    showToast(L("সেভ হয়েছে", "Saved"), "success");
  }

  async function load() {
    const { data } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
    setCats((data as Category[]) ?? []);
    const { data: prods } = await supabase.from("products").select("category_id").not("category_id", "is", null).limit(5000);
    const c: Record<string, number> = {};
    for (const p of (prods as any[]) ?? []) c[p.category_id] = (c[p.category_id] ?? 0) + 1;
    setCounts(c);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const tops = cats.filter((c) => !c.parent_id);
  const kidsOf = (id: string) => cats.filter((c) => c.parent_id === id);

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    setUploading(true);
    try {
      const path = `cat-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
      const { error } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      setForm({ ...form, image_url: data.publicUrl });
    } catch (err: any) {
      showToast(err.message || L("আপলোড ব্যর্থ", "Upload failed"), "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function pairForm(field: "name" | "note", side: "bn" | "en" = "bn") {
    if (!form) return;
    const r = await autoPair(side, (form as any)[`${field}_bn`] ?? "", (form as any)[`${field}_en`] ?? "");
    if (!r) return;
    setForm((f) => (f ? { ...f, ...(r.bn !== undefined ? { [`${field}_bn`]: r.bn } : {}), ...(r.en !== undefined ? { [`${field}_en`]: r.en } : {}) } : f));
  }

  async function pairAll(side: "bn" | "en") {
    const r = await autoPair(side, allNoteBn, allNoteEn);
    if (r?.bn !== undefined) setAllNoteBn(r.bn);
    if (r?.en !== undefined) setAllNoteEn(r.en);
  }

  async function save() {
    if (!form) return;
    if (!form.name_bn.trim() && !form.name_en.trim()) return showToast(L("নাম লিখুন", "Enter a name"), "error");
    const name_bn = form.name_bn.trim() || form.name_en.trim();
    const name_en = form.name_en.trim() || form.name_bn.trim();
    setSaving(true);
    try {
      const payload: any = {
        name_bn,
        name_en,
        parent_id: form.parent_id || null,
        icon: form.icon.trim() || null,
        image_url: form.image_url.trim() || null,
        note_bn: form.note_bn.trim() || null,
        note_en: form.note_en.trim() || null,
        is_active: form.is_active
      };
      if (form.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const siblings = cats.filter((c) => (c.parent_id ?? "") === (form.parent_id || ""));
        payload.sort_order = siblings.length ? Math.max(...siblings.map((c) => c.sort_order)) + 1 : 1;
        payload.slug = makeSlug(name_en, name_bn);
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
      showToast(L("সেভ হয়েছে", "Saved"), "success");
      setForm(null);
      load();
    } catch (err: any) {
      showToast(err.message || L("সেভ ব্যর্থ", "Save failed"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Category) {
    const { error } = await supabase.from("categories").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return showToast(error.message, "error");
    load();
  }

  async function remove(c: Category) {
    const n = counts[c.id] ?? 0;
    if (n > 0) return showToast(L(`এতে ${n}টি পণ্য আছে — আগে পণ্য অন্য ক্যাটাগরিতে নিন, নয়তো "বন্ধ" করুন`, `${n} products inside — move them first or just turn it off`), "error");
    if (kidsOf(c.id).length > 0) return showToast(L("আগে এর সাব-ক্যাটাগরি সরান", "Remove its sub-categories first"), "error");
    if (!confirm(L("এই ক্যাটাগরি মুছবেন?", "Delete this category?"))) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return showToast(error.message, "error");
    load();
  }

  async function move(list: Category[], c: Category, dir: -1 | 1) {
    const i = list.findIndex((x) => x.id === c.id);
    const other = list[i + dir];
    if (!other) return;
    // সবার ক্রম নতুন করে বসাই, যাতে সমান নম্বর থাকলেও ঠিক কাজ করে
    const next = [...list];
    next[i] = other;
    next[i + dir] = c;
    const results = await Promise.all(next.map((x, idx) => supabase.from("categories").update({ sort_order: idx + 1 }).eq("id", x.id)));
    const bad = results.find((r) => r.error);
    if (bad?.error) showToast(bad.error.message, "error");
    load();
  }

  function edit(c: Category) {
    setForm({
      id: c.id,
      name_bn: c.name_bn,
      name_en: c.name_en,
      parent_id: c.parent_id ?? "",
      icon: c.icon ?? "",
      image_url: c.image_url ?? "",
      note_bn: (c as any).note_bn ?? "",
      note_en: (c as any).note_en ?? "",
      is_active: c.is_active
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function Row({ c, list, sub }: { c: Category; list: Category[]; sub?: boolean }) {
    return (
      <div className={`flex items-center gap-2 bg-white border border-border rounded-xl p-2.5 ${sub ? "ml-5" : ""} ${c.is_active ? "" : "opacity-55"}`}>
        <div className="w-11 h-11 rounded-lg bg-teal-tint overflow-hidden flex items-center justify-center shrink-0 text-lg">
          {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover" /> : c.icon || "🛍️"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate">{lang === "en" ? c.name_en : c.name_bn}</div>
          <div className="text-[11px] text-mute truncate">
            {lang === "en" ? c.name_bn : c.name_en} · {counts[c.id] ?? 0} {L("পণ্য", "products")}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => move(list, c, -1)} className="press p-1.5 text-mute"><ArrowUp size={15} /></button>
          <button onClick={() => move(list, c, 1)} className="press p-1.5 text-mute"><ArrowDown size={15} /></button>
          <button onClick={() => toggle(c)} className="press p-1.5 text-mute">{c.is_active ? <Eye size={16} /> : <EyeOff size={16} />}</button>
          <button onClick={() => edit(c)} className="press p-1.5 text-teal"><Pencil size={15} /></button>
          <button onClick={() => remove(c)} className="press p-1.5 text-red-500"><Trash2 size={15} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl pb-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-extrabold text-lg">{L("ক্যাটাগরি ম্যানেজ", "Manage Categories")}</h1>
        <button onClick={() => setForm({ ...EMPTY })} className="press bg-teal text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
          <Plus size={14} /> {L("নতুন", "New")}
        </button>
      </div>

      {form && (
        <div className="bg-teal-tint border border-teal/20 rounded-2xl p-3 mb-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-sm">{form.id ? L("ক্যাটাগরি এডিট", "Edit category") : L("নতুন ক্যাটাগরি", "New category")}</div>
            <button onClick={() => setForm(null)} className="press"><X size={18} /></button>
          </div>
          <input className="input" placeholder={L("বাংলা নাম — যেমন মোবাইল ও গ্যাজেট", "Bangla name")} value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} onBlur={() => pairForm("name")} />
          <input className="input" placeholder={L("ইংরেজি নাম — যেমন Mobile & Gadgets", "English name")} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} onBlur={() => pairForm("name", "en")} />
          <select className="input" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
            <option value="">{L("— মূল ক্যাটাগরি (প্রধান)", "— Main category")}</option>
            {tops.filter((t) => t.id !== form.id).map((t) => (
              <option key={t.id} value={t.id}>{L("এর ভেতরে: ", "Inside: ")}{lang === "en" ? t.name_en : t.name_bn}</option>
            ))}
          </select>
          <input className="input" placeholder={L("ইমোজি আইকন (ঐচ্ছিক) — 📱 💡 👗", "Emoji icon (optional)")} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          <div className="flex items-center gap-2">
            <div className="w-16 h-16 rounded-xl bg-white border border-border overflow-hidden flex items-center justify-center text-xs text-mute shrink-0">
              {form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" /> : L("ছবি নেই", "No image")}
            </div>
            <label className="press flex-1 bg-white border border-border rounded-lg py-2.5 text-xs font-bold text-teal-dark flex items-center justify-center gap-1.5">
              <Upload size={14} /> {uploading ? L("আপলোড হচ্ছে...", "Uploading...") : L("ছবি দিন", "Upload image")}
              <input type="file" accept="image/*" className="hidden" onChange={uploadImage} />
            </label>
            {form.image_url && (
              <button onClick={() => setForm({ ...form, image_url: "" })} className="press text-xs text-red-500 font-bold">{L("সরান", "Remove")}</button>
            )}
          </div>
          <div className="text-[11px] text-mute">{L("ছবি না দিলে ওই ক্যাটাগরির পণ্যের ছবি নিজে থেকে বসবে।", "Without an image, a product photo from it is used.")}</div>
          <div className="text-xs font-bold text-mute">{L("নোট (ডেলিভারি কোথায় কোথায় দেবেন ইত্যাদি)", "Note (e.g. delivery areas)")}</div>
          <textarea className="input resize-none" rows={3} placeholder={L("যেমন: শুধু চৌদ্দগ্রাম ও কুমিল্লা শহরে ডেলিভারি। ফাঁকা রাখলে নোট দেখাবে না।", "Bangla note")} value={form.note_bn} onChange={(e) => setForm({ ...form, note_bn: e.target.value })} onBlur={() => pairForm("note")} />
          <textarea className="input resize-none" rows={2} placeholder={L("English note (ঐচ্ছিক)", "English note (optional)")} value={form.note_en} onChange={(e) => setForm({ ...form, note_en: e.target.value })} onBlur={() => pairForm("note", "en")} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            {L("চালু (সাইটে দেখাবে)", "Active (show on site)")}
          </label>
          <button onClick={save} disabled={saving} className="press w-full bg-orange text-white font-extrabold py-3 rounded-xl disabled:opacity-60">
            {saving ? L("সেভ হচ্ছে...", "Saving...") : L("সেভ করুন", "Save")}
          </button>
        </div>
      )}

      <div className="bg-white border border-border rounded-2xl p-3 mb-4 space-y-2">
        <div className="font-extrabold text-sm">{L("সব পণ্যের উপরের নোট", "Note above All products")}</div>
        <div className="text-[11px] text-mute">{L("ক্যাটাগরি না বেছে সব পণ্যের পেইজে এই নোট ওপরে দেখাবে। ফাঁকা রাখলে দেখাবে না।", "Shown above the all-products page. Leave empty to hide.")}</div>
        <textarea className="input resize-none" rows={2} placeholder={L("বাংলা নোট", "Bangla note")} value={allNoteBn} onChange={(e) => setAllNoteBn(e.target.value)} onBlur={() => pairAll("bn")} />
        <textarea className="input resize-none" rows={2} placeholder={L("English note (ঐচ্ছিক)", "English note (optional)")} value={allNoteEn} onChange={(e) => setAllNoteEn(e.target.value)} onBlur={() => pairAll("en")} />
        <button onClick={saveAllNote} disabled={allSaving} className="press w-full bg-teal text-white font-bold text-sm py-2.5 rounded-xl disabled:opacity-60">
          {allSaving ? L("সেভ হচ্ছে...", "Saving...") : L("নোট সেভ করুন", "Save note")}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-mute">{L("লোড হচ্ছে...", "Loading...")}</div>
      ) : (
        <div className="space-y-2">
          {tops.map((t) => (
            <div key={t.id} className="space-y-1.5">
              <Row c={t} list={tops} />
              {kidsOf(t.id).map((k) => (
                <Row key={k.id} c={k} list={kidsOf(t.id)} sub />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
