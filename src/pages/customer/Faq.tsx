import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { LineSkeleton } from "../../components/LoadingSkeleton";

interface Faq {
  id: string;
  question_bn: string;
  question_en: string | null;
  answer_bn: string;
  answer_en: string | null;
}

export default function FaqPage() {
  const { lang } = useLanguage();
  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("faqs")
      .select("id, question_bn, question_en, answer_bn, answer_en")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setItems((data as Faq[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="font-extrabold text-lg mb-3">{lang === "bn" ? "সাধারণ প্রশ্ন (FAQ)" : "Frequently Asked Questions"}</h1>
      {loading ? (
        <LineSkeleton className="h-16 w-full" />
      ) : items.length === 0 ? (
        <div className="text-center text-sm text-mute py-16">
          {lang === "bn" ? "এখনো কোনো প্রশ্ন যোগ করা হয়নি" : "No questions added yet"}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((f) => {
            const q = lang === "en" && f.question_en ? f.question_en : f.question_bn;
            const a = lang === "en" && f.answer_en ? f.answer_en : f.answer_bn;
            const on = openId === f.id;
            return (
              <div key={f.id} className="bg-white border border-border rounded-xl overflow-hidden">
                <button onClick={() => setOpenId(on ? null : f.id)} className="press w-full flex items-center justify-between gap-3 text-left p-3.5">
                  <span className="text-[13.5px] font-bold text-ink">{q}</span>
                  <ChevronDown size={18} className={`shrink-0 text-teal transition-transform ${on ? "rotate-180" : ""}`} />
                </button>
                {on && <div className="px-3.5 pb-3.5 text-[13px] text-mute leading-relaxed whitespace-pre-line">{a}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
