import React from "react";

interface Props {
  on: boolean;
  price: string;
  oldPrice: string;
  currentPrice: string;
  onChange: (v: { on: boolean; price: string }) => void;
}

/** পণ্য ফর্মে "Drop shipping ✅" অন/অফ + ড্রপশিপারদের জন্য পাইকারি মূল্য */
export default function DropshipToggle({ on, price, oldPrice, currentPrice, onChange }: Props) {
  const wh = Number(price) || 0;
  const cur = Number(currentPrice) || 0;
  return (
    <div className={`rounded-2xl border p-3 mb-6 ${on ? "border-teal bg-teal-tint" : "border-border bg-white"}`}>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={on} onChange={(e) => onChange({ on: e.target.checked, price })} />
        <span className="text-sm font-semibold">Drop shipping</span>
      </label>
      {on && (
        <div className="mt-3">
          <label htmlFor="ds-price" className="block text-xs font-bold text-mute mb-1">
            ড্রপশিপারদের জন্য মূল্য (৳) — এই দামে তারা নেবে
          </label>
          <input id="ds-price" type="number" inputMode="decimal" value={price} onChange={(e) => onChange({ on, price: e.target.value })} className="input" placeholder="যেমন 600" />
          <div className="text-[11px] text-mute mt-2 leading-relaxed">
            ড্রপশিপাররা এই মূল্যটাই "পাইকারি দাম" হিসেবে দেখবে। সাথে দেখবে সাইটের পূর্বের মূল্য ৳{oldPrice || "—"} ও বর্তমান মূল্য ৳{currentPrice || "—"}, যাতে বিক্রির আইডিয়া পায়। তারা চাইলে এর চেয়ে বেশি যেকোনো দামে বিক্রি করতে পারবে।
          </div>
          {wh > 0 && cur > 0 && wh >= cur && <div className="text-[11px] text-orange font-semibold mt-1">⚠ ড্রপশিপ মূল্য সাইটের বর্তমান মূল্যের সমান বা বেশি। লাভের জায়গা কম থাকবে।</div>}
        </div>
      )}
    </div>
  );
}
