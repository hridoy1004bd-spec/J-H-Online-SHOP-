import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Trash2, BadgeCheck, MapPin } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatDate } from "../../utils/format";
import Stars from "../../components/Stars";
import { LineSkeleton } from "../../components/LoadingSkeleton";

interface Row {
  id: string;
  display_name: string;
  location: string | null;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  source: "customer" | "admin";
  verified: boolean;
  created_at: string;
}

type Tab = "pending" | "approved" | "rejected";

export default function AdminReviews() {
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("shop_reviews").select("*").order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(r: Row, status: Tab) {
    const { error } = await supabase.from("shop_reviews").update({ status }).eq("id", r.id);
    if (error) return showToast(error.message, "error");
    showToast(status === "approved" ? "প্রকাশ হয়েছে ✓" : "বাতিল করা হয়েছে", "success");
    load();
  }

  async function remove(r: Row) {
    if (!confirm("এই রিভিউ মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("shop_reviews").delete().eq("id", r.id);
    if (error) return showToast(error.message, "error");
    load();
  }

  async function addReview() {
    if (!name.trim() || body.trim().length < 3) return showToast("নাম ও রিভিউ লিখুন", "error");
    setSaving(true);
    const { error } = await supabase.from("shop_reviews").insert({
      display_name: name.trim(),
      location: location.trim() || null,
      rating,
      body: body.trim(),
      status: "approved",
      source: "admin",
      verified: false
    });
    setSaving(false);
    if (error) return showToast(error.message, "error");
    showToast("রিভিউ যোগ হয়েছে ✓", "success");
    setName("");
    setLocation("");
    setBody("");
    setRating(5);
    setShowForm(false);
    load();
  }

  const shown = rows.filter((r) => r.status === tab);
  const count = (s: Tab) => rows.filter((r) => r.status === s).length;

  return (
    <div className="pb-10 max-w-lg">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-extrabold text-lg">কাস্টমার রিভিউ</h1>
        <button onClick={() => setShowForm((v) => !v)} className="press bg-teal text-white text-xs font-bold px-4 py-2 rounded-full">
          {showForm ? "বন্ধ করুন" : "+ রিভিউ যোগ করুন"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-border rounded-2xl p-4 mb-4 space-y-3">
          <div className="text-[11.5px] bg-orange-tint text-orange rounded-lg px-3 py-2 font-semibold">
            শুধু সত্যিকারের কাস্টমারের রিভিউ যোগ করুন (যেমন WhatsApp/ফেসবুকে পাওয়া, তাঁর অনুমতি নিয়ে)। বানানো নাম বা বানানো রিভিউ দেবেন না — এতে ক্রেতার আস্থা নষ্ট হয়।
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="কাস্টমারের নাম" className="input" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="এলাকা (যেমন: কুমিল্লা)" className="input" />
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className="press text-2xl leading-none">
                <span className={n <= rating ? "text-[#F5A623]" : "text-gray-300"}>★</span>
              </button>
            ))}
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="রিভিউ" className="input resize-none" />
          <button onClick={addReview} disabled={saving} className="press w-full bg-teal text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60">
            {saving ? "সেভ হচ্ছে..." : "প্রকাশ করুন"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        {(
          [
            ["pending", "অপেক্ষায়"],
            ["approved", "প্রকাশিত"],
            ["rejected", "বাতিল"]
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`press text-xs font-bold py-2.5 rounded-xl border ${tab === k ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"}`}
          >
            {label} ({count(k)})
          </button>
        ))}
      </div>

      {loading ? (
        <LineSkeleton className="h-24 w-full" />
      ) : shown.length === 0 ? (
        <div className="text-center text-sm text-mute py-10">কোনো রিভিউ নেই</div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div key={r.id} className="bg-white border border-border rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <div className="font-extrabold text-sm truncate">{r.display_name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-mute">
                    {r.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin size={10} /> {r.location}
                      </span>
                    )}
                    <span>{formatDate(r.created_at, lang)}</span>
                  </div>
                </div>
                <Stars value={r.rating} size={13} />
              </div>
              <p className="text-[13px] text-ink/85 whitespace-pre-line mb-2">{r.body}</p>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${r.source === "admin" ? "bg-orange-tint text-orange" : "bg-gray-100 text-mute"}`}>
                  {r.source === "admin" ? "অ্যাডমিন যোগ করেছে" : "কাস্টমার দিয়েছে"}
                </span>
                {r.verified && (
                  <span className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-teal-tint text-teal-dark">
                    <BadgeCheck size={11} /> ডেলিভারি পাওয়া ক্রেতা
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {r.status !== "approved" && (
                  <button onClick={() => setStatus(r, "approved")} className="press flex-1 flex items-center justify-center gap-1 bg-teal-tint text-teal-dark text-xs font-bold py-2 rounded-lg">
                    <CheckCircle2 size={14} /> ✅ প্রকাশ করুন
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button onClick={() => setStatus(r, "rejected")} className="press flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 text-xs font-bold py-2 rounded-lg">
                    <XCircle size={14} /> ❌ বাতিল
                  </button>
                )}
                <button onClick={() => remove(r)} className="press shrink-0 text-red-400 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
