import React from "react";
import { Info } from "lucide-react";

/** অ্যাডমিনের দেওয়া নোট। ফাঁকা হলে কিছুই দেখায় না। */
export default function CategoryNote({ text }: { text: string | null | undefined }) {
  const t = (text ?? "").trim();
  if (!t) return null;
  return (
    <div className="mx-4 mt-3 flex items-start gap-2 bg-orange-tint border border-orange/25 rounded-xl p-3">
      <Info size={16} className="text-orange shrink-0 mt-0.5" />
      <div className="text-[12.5px] font-semibold text-ink leading-relaxed whitespace-pre-line">{t}</div>
    </div>
  );
}
