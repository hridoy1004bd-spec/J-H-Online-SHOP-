import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import MenuIcon, { MENU_ICONS } from "../../components/MenuIcon";
import { LineSkeleton } from "../../components/LoadingSkeleton";

interface Item {
  id: string;
  label_bn: string;
  label_en: string | null;
  icon: string;
  link: string;
  sort_order: number;
  is_active: boolean;
}

export default function AdminMenu() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ label_bn: "", label_en: "", icon: "link", link: "" });

  async function load() {
    const { data } = await supabase.from("menu_items").select("*").order("sort_order");
    setItems((data as Item[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function edit(id: string, patch: Partial<Item>) {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function save(i: Item) {
    if (!i.label_bn.trim() || !i.link.trim()) return showToast("নাম ও লিংক দিন", "error");
    const { error } = await supabase
      .from("menu_items")
      .update({
        label_bn: i.label_bn.trim(),
        label_en: i.label_en?.trim() || null,
        icon: i.icon,
        link: i.link.trim(),
        is_active: i.is_active
      })
      .eq("id", i.id);
    if (error) return showToast(error.message, "error");
    showToast("সেভ হয়েছে ✓", "success");
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[idx];
    const b = items[j];
    await Promise.all([
      supabase.from("menu_items").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("menu_items").update({ sort_order: a.sort_order }).eq("id", b.id)
    ]);
    load();
  }

  async function remove(i: Item) {
    if (!confirm(`"${i.label_bn}" মুছে ফেলবেন?`)) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", i.id);
    if (error) return showToast(error.message, "error");
    load();
  }

  async function add() {
    if (!newItem.label_bn.trim() || !newItem.link.trim()) return showToast("নাম ও লিংক দিন", "error");
    const max = items.reduce((m, i) => Math.max(m, i.sort_order), 0);
    const { error } = await supabase.from("menu_items").insert({
      label_bn: newItem.label_bn.trim(),
      label_en: newItem.label_en.trim() || null,
      icon: newItem.icon,
      link: newItem.link.trim(),
      sort_order: max + 1
    });
    if (error) return showToast(error.message, "error");
    showToast("যোগ হয়েছে ✓", "success");
    setNewItem({ label_bn: "", label_en: "", icon: "link", link: "" });
    load();
  }

  return (
    <div className="pb-10 max-w-lg">
      <h1 className="font-extrabold text-lg mb-1">মেনু ম্যানেজ</h1>
      <div className="text-[11.5px] text-mute mb-4">
        সাইটের ওপরের ডানের ≡ মেনুতে যা যা দেখাবে এখান থেকে ঠিক করুন। লিংক সাইটের ভেতরের পেইজ হলে /reviews এভাবে লিখুন, বাইরের লিংক (যেমন WhatsApp/Telegram/Facebook গ্রুপ) হলে https:// দিয়ে পুরো লিংক দিন।
      </div>

      <div className="bg-white border border-border rounded-2xl p-4 mb-5 space-y-2">
        <div className="font-extrabold text-sm">+ নতুন মেনু আইটেম</div>
        <input value={newItem.label_bn} onChange={(e) => setNewItem({ ...newItem, label_bn: e.target.value })} placeholder="নাম (বাংলা)" className="input" />
        <input value={newItem.label_en} onChange={(e) => setNewItem({ ...newItem, label_en: e.target.value })} placeholder="Name (English, ঐচ্ছিক)" className="input" />
        <input value={newItem.link} onChange={(e) => setNewItem({ ...newItem, link: e.target.value })} placeholder="/page বা https://..." className="input" />
        <select value={newItem.icon} onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })} className="input">
          {Object.entries(MENU_ICONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <button onClick={add} className="press w-full bg-teal text-white font-bold text-sm py-2.5 rounded-xl">
          যোগ করুন
        </button>
      </div>

      {loading ? (
        <LineSkeleton className="h-24 w-full" />
      ) : (
        <div className="space-y-3">
          {items.map((i, idx) => (
            <div key={i.id} className="bg-white border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-teal-tint text-teal-dark flex items-center justify-center shrink-0">
                  <MenuIcon name={i.icon} size={16} />
                </span>
                <input value={i.label_bn} onChange={(e) => edit(i.id, { label_bn: e.target.value })} className="input flex-1 min-w-0" />
                <button onClick={() => move(idx, -1)} className="press text-mute p-1" aria-label="up">
                  <ArrowUp size={16} />
                </button>
                <button onClick={() => move(idx, 1)} className="press text-mute p-1" aria-label="down">
                  <ArrowDown size={16} />
                </button>
              </div>
              <input value={i.label_en ?? ""} onChange={(e) => edit(i.id, { label_en: e.target.value })} placeholder="Name (English)" className="input" />
              <input value={i.link} onChange={(e) => edit(i.id, { link: e.target.value })} placeholder="/page বা https://..." className="input" />
              <select value={i.icon} onChange={(e) => edit(i.id, { icon: e.target.value })} className="input">
                {Object.entries(MENU_ICONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" checked={i.is_active} onChange={(e) => edit(i.id, { is_active: e.target.checked })} />
                  মেনুতে দেখাও
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={() => remove(i)} className="press text-red-400 p-1.5">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => save(i)} className="press bg-teal text-white text-xs font-bold px-4 py-2 rounded-lg">
                    সেভ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
