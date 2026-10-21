import { autoPair } from "../../services/translateService";
import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { LineSkeleton } from "../../components/LoadingSkeleton";

interface Faq {
  id: string;
  question_bn: string;
  question_en: string | null;
  answer_bn: string;
  answer_en: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function AdminFaq() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [n, setN] = useState({ question_bn: "", answer_bn: "", question_en: "", answer_en: "" });

  async function load() {
    const { data } = await supabase.from("faqs").select("*").order("sort_order");
    setItems((data as Faq[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function edit(id: string, patch: Partial<Faq>) {
    setItems((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function save(i: Faq) {
    if (!(i.question_bn.trim() || (i.question_en ?? "").trim()) || !(i.answer_bn.trim() || (i.answer_en ?? "").trim())) return showToast("প্রশ্ন ও উত্তর দিন", "error");
    const { error } = await supabase
      .from("faqs")
      .update({
        question_bn: i.question_bn.trim() || (i.question_en ?? "").trim(),
        answer_bn: i.answer_bn.trim() || (i.answer_en ?? "").trim(),
        question_en: i.question_en?.trim() || null,
        answer_en: i.answer_en?.trim() || null,
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
      supabase.from("faqs").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("faqs").update({ sort_order: a.sort_order }).eq("id", b.id)
    ]);
    load();
  }

  async function remove(i: Faq) {
    if (!confirm("এই প্রশ্নটি মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", i.id);
    if (error) return showToast(error.message, "error");
    load();
  }

  async function pairNew(base: "question" | "answer", side: "bn" | "en") {
    const r = await autoPair(side, (n as any)[`${base}_bn`], (n as any)[`${base}_en`]);
    if (!r) return;
    setN((x) => ({ ...x, ...(r.bn !== undefined ? { [`${base}_bn`]: r.bn } : {}), ...(r.en !== undefined ? { [`${base}_en`]: r.en } : {}) }));
  }

  async function pairRow(row: any, base: "question" | "answer", side: "bn" | "en") {
    const r = await autoPair(side, row[`${base}_bn`] ?? "", row[`${base}_en`] ?? "");
    if (!r) return;
    edit(row.id, { ...(r.bn !== undefined ? { [`${base}_bn`]: r.bn } : {}), ...(r.en !== undefined ? { [`${base}_en`]: r.en } : {}) } as any);
  }

  async function add() {
    if (!(n.question_bn.trim() || n.question_en.trim()) || !(n.answer_bn.trim() || n.answer_en.trim())) return showToast("প্রশ্ন ও উত্তর দিন", "error");
    const max = items.reduce((m, i) => Math.max(m, i.sort_order), 0);
    const { error } = await supabase.from("faqs").insert({
      question_bn: n.question_bn.trim() || n.question_en.trim(),
      answer_bn: n.answer_bn.trim() || n.answer_en.trim(),
      question_en: n.question_en.trim() || null,
      answer_en: n.answer_en.trim() || null,
      sort_order: max + 1
    });
    if (error) return showToast(error.message, "error");
    showToast("যোগ হয়েছে ✓", "success");
    setN({ question_bn: "", answer_bn: "", question_en: "", answer_en: "" });
    load();
  }

  return (
    <div className="pb-10 max-w-lg">
      <h1 className="font-extrabold text-lg mb-1">সাধারণ প্রশ্ন (FAQ)</h1>
      <div className="text-[11.5px] text-mute mb-4">কাস্টমাররা ≡ মেনুর "সাধারণ প্রশ্ন" থেকে /faq পেইজে এগুলো দেখবে। ইংরেজি ঘর ফাঁকা রাখলে বাংলাই দেখাবে।</div>

      <div className="bg-white border border-border rounded-2xl p-4 mb-5 space-y-2">
        <div className="font-extrabold text-sm">+ নতুন প্রশ্ন</div>
        <input value={n.question_bn} onChange={(e) => setN({ ...n, question_bn: e.target.value })} onBlur={() => pairNew("question", "bn")} placeholder="প্রশ্ন (বাংলা)" className="input" />
        <textarea value={n.answer_bn} onChange={(e) => setN({ ...n, answer_bn: e.target.value })} onBlur={() => pairNew("answer", "bn")} placeholder="উত্তর (বাংলা)" rows={3} className="input resize-none" />
        <input value={n.question_en} onChange={(e) => setN({ ...n, question_en: e.target.value })} onBlur={() => pairNew("question", "en")} placeholder="Question (English, ঐচ্ছিক)" className="input" />
        <textarea value={n.answer_en} onChange={(e) => setN({ ...n, answer_en: e.target.value })} onBlur={() => pairNew("answer", "en")} placeholder="Answer (English, ঐচ্ছিক)" rows={3} className="input resize-none" />
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
                <input value={i.question_bn} onChange={(e) => edit(i.id, { question_bn: e.target.value })} onBlur={() => pairRow(i, "question", "bn")} className="input flex-1 min-w-0" />
                <button onClick={() => move(idx, -1)} className="press text-mute p-1" aria-label="up">
                  <ArrowUp size={16} />
                </button>
                <button onClick={() => move(idx, 1)} className="press text-mute p-1" aria-label="down">
                  <ArrowDown size={16} />
                </button>
              </div>
              <textarea value={i.answer_bn} onChange={(e) => edit(i.id, { answer_bn: e.target.value })} onBlur={() => pairRow(i, "answer", "bn")} rows={3} className="input resize-none" />
              <input value={i.question_en ?? ""} onChange={(e) => edit(i.id, { question_en: e.target.value })} onBlur={() => pairRow(i, "question", "en")} placeholder="Question (English)" className="input" />
              <textarea value={i.answer_en ?? ""} onChange={(e) => edit(i.id, { answer_en: e.target.value })} onBlur={() => pairRow(i, "answer", "en")} placeholder="Answer (English)" rows={2} className="input resize-none" />
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" checked={i.is_active} onChange={(e) => edit(i.id, { is_active: e.target.checked })} />
                  দেখাও
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
