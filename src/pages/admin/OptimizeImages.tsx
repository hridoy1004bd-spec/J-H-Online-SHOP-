import React, { useState } from "react";
import { ImageDown } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { compressForUpload } from "../../services/uploadService";
import { useLanguage } from "../../i18n/LanguageContext";

/**
 * পুরনো বড় ছবি (ব্যানার, ফিচার্ড ব্যানার, ক্যাটাগরি, লোগো) এক বোতামে ছোট করে।
 * ছবি ব্রাউজারে নামিয়ে ছোট করে নতুন ফাইল হিসেবে আপলোড করে, তারপর ডাটাবেসের লিংক বদলে দেয়।
 * আসল পুরনো ফাইল মুছে না (চাইলে পরে Supabase Storage থেকে মুছতে পারেন)।
 */
interface Target {
  table: string;
  col: string;
  label: string;
  maxDim: number;
  idCol?: string;
}
const TARGETS: Target[] = [
  { table: "banners", col: "image_url", label: "ব্যানার", maxDim: 1280 },
  { table: "featured_banners", col: "image_url", label: "ফিচার্ড ব্যানার", maxDim: 1280 },
  { table: "categories", col: "image_url", label: "ক্যাটাগরি", maxDim: 480 },
  { table: "store_settings", col: "logo_url", label: "লোগো", maxDim: 512 }
];
const MIN_BYTES = 250 * 1024;

interface Item {
  key: string;
  table: string;
  col: string;
  id: string | number;
  label: string;
  url: string;
  maxDim: number;
  size: number;
  status: "found" | "working" | "done" | "skip" | "error";
  newSize?: number;
  msg?: string;
}

const kb = (n: number) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.round(n / 1024) + " KB");

export default function OptimizeImages() {
  const { lang } = useLanguage();
  const L = (bn: string, en: string) => (lang === "en" ? en : bn);
  const [items, setItems] = useState<Item[]>([]);
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [scanned, setScanned] = useState(false);

  function patch(key: string, p: Partial<Item>) {
    setItems((all) => all.map((i) => (i.key === key ? { ...i, ...p } : i)));
  }

  async function scan() {
    setScanning(true);
    const found: Item[] = [];
    for (const t of TARGETS) {
      const { data } = await supabase.from(t.table).select(`id, ${t.col}`);
      for (const row of (data as any[]) ?? []) {
        const url: string | null = row[t.col];
        if (!url || !/^https?:/.test(url)) continue;
        let size = 0;
        try {
          const r = await fetch(url, { method: "HEAD" });
          size = Number(r.headers.get("content-length") || 0);
          if (!size) {
            const b = await (await fetch(url)).blob();
            size = b.size;
          }
        } catch {
          continue;
        }
        if (size >= MIN_BYTES) found.push({ key: `${t.table}-${row.id}`, table: t.table, col: t.col, id: row.id, label: t.label, url, maxDim: t.maxDim, size, status: "found" });
      }
    }
    found.sort((a, b) => b.size - a.size);
    setItems(found);
    setScanned(true);
    setScanning(false);
  }

  async function runAll() {
    setRunning(true);
    let n = 0;
    for (const it of items) {
      if (it.status === "done") continue;
      patch(it.key, { status: "working" });
      try {
        const blob = await (await fetch(it.url)).blob();
        const c = await compressForUpload(blob, it.maxDim, 0.8);
        if (c.blob.size >= blob.size * 0.9) {
          patch(it.key, { status: "skip", msg: L("আগেই ছোট", "Already small") });
          continue;
        }
        const path = `opt-${Date.now()}-${n++}.${c.ext}`;
        const { error: e1 } = await supabase.storage.from("banners").upload(path, c.blob, { contentType: c.type, cacheControl: "31536000", upsert: false });
        if (e1) throw e1;
        const newUrl = supabase.storage.from("banners").getPublicUrl(path).data.publicUrl;
        const { error: e2 } = await supabase.from(it.table).update({ [it.col]: newUrl }).eq("id", it.id);
        if (e2) throw e2;
        patch(it.key, { status: "done", newSize: c.blob.size, url: newUrl });
      } catch (e: any) {
        patch(it.key, { status: "error", msg: e?.message || "Error" });
      }
    }
    setRunning(false);
  }

  const total = items.reduce((a, i) => a + i.size, 0);
  const saved = items.filter((i) => i.status === "done").reduce((a, i) => a + (i.size - (i.newSize ?? i.size)), 0);

  return (
    <div>
      <h1 className="font-extrabold text-lg mb-1 flex items-center gap-2">
        <ImageDown size={20} /> {L("ছবি ছোট করুন", "Shrink images")}
      </h1>
      <div className="text-xs text-mute mb-4">
        {L(
          "বড় ছবি সাইটের ডাউনলোড খরচ (Supabase Egress) বাড়ায়। এখানে চাপলে পুরনো বড় ছবি ছোট হয়ে নতুন করে সেভ হবে, দেখতে প্রায় একই থাকবে।",
          "Large images increase download cost (Supabase egress). Tap below to shrink old large images; they look almost the same."
        )}
      </div>

      {!scanned && (
        <button onClick={scan} disabled={scanning} className="press w-full bg-teal text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60">
          {scanning ? L("খুঁজছি...", "Scanning...") : L("বড় ছবি খুঁজুন", "Find large images")}
        </button>
      )}

      {scanned && items.length === 0 && <div className="bg-teal-tint text-teal-dark rounded-xl p-4 text-sm font-semibold">{L("কোনো বড় ছবি নেই। সব ঠিক আছে ✓", "No large images. All good ✓")}</div>}

      {items.length > 0 && (
        <>
          <div className="bg-white border border-border rounded-xl p-3 mb-3 text-sm">
            {L("বড় ছবি", "Large images")}: <b>{items.length}</b> · {L("মোট", "Total")} <b>{kb(total)}</b>
            {saved > 0 && (
              <>
                {" "}
                · {L("বাঁচলো", "Saved")} <b className="text-teal-dark">{kb(saved)}</b>
              </>
            )}
          </div>
          <button onClick={runAll} disabled={running} className="press w-full bg-orange text-white font-bold text-sm py-3 rounded-xl mb-3 disabled:opacity-60">
            {running ? L("ছোট করা হচ্ছে... (পেজ বন্ধ করবেন না)", "Shrinking... (keep this page open)") : L("সবগুলো ছোট করুন", "Shrink all")}
          </button>
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.key} className="bg-white border border-border rounded-xl p-2.5 flex items-center gap-3">
                <img src={i.url} alt="" className="w-14 h-14 rounded-lg object-cover bg-bg shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{i.label}</div>
                  <div className="text-[11px] text-mute">
                    {kb(i.size)}
                    {i.newSize ? ` → ${kb(i.newSize)}` : ""}
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${i.status === "done" ? "bg-teal-tint text-teal-dark" : i.status === "error" ? "bg-red-50 text-red-600" : "bg-orange-tint text-orange"}`}>
                  {i.status === "found" && L("বড়", "Large")}
                  {i.status === "working" && "..."}
                  {i.status === "done" && "✓"}
                  {i.status === "skip" && (i.msg ?? "OK")}
                  {i.status === "error" && L("ব্যর্থ", "Failed")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
