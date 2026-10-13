import React, { useState } from "react";
import { Truck, CircleCheck, Clock, Boxes, Package, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { money, formatDate } from "../../utils/format";
import type { OrderStatus } from "../../types";

interface Tracked {
  order_number: string;
  status: OrderStatus;
  created_at: string;
  subtotal: number;
  delivery_charge: number;
  total: number;
  items: { name: string; size: string | null; color: string | null; quantity: number; line_total: number }[];
}

const FLOW: { key: OrderStatus; icon: any; bn: string; en: string }[] = [
  { key: "pending", icon: Clock, bn: "অর্ডার পেয়েছি", en: "Order placed" },
  { key: "confirmed", icon: CircleCheck, bn: "নিশ্চিত হয়েছে", en: "Confirmed" },
  { key: "processing", icon: Boxes, bn: "প্যাকিং হচ্ছে", en: "Processing" },
  { key: "shipped", icon: Truck, bn: "পথে আছে", en: "On the way" },
  { key: "delivered", icon: Package, bn: "পৌঁছে গেছে", en: "Delivered" }
];

export default function TrackOrder() {
  const { lang } = useLanguage();
  const bn = lang === "bn";
  const [orderNo, setOrderNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Tracked | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNo.trim() || !mobile.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    const { data, error } = await supabase.rpc("track_order", {
      p_order_number: orderNo.trim(),
      p_mobile: mobile.trim()
    });
    setLoading(false);
    if (error || !data) {
      setNotFound(true);
      return;
    }
    setResult(data as Tracked);
  }

  const stepIndex = result ? FLOW.findIndex((s) => s.key === result.status) : -1;
  const cancelled = result && (result.status === "cancelled" || result.status === "returned");

  return (
    <div className="px-4 py-5">
      <h1 className="font-extrabold text-lg mb-1">{bn ? "অর্ডার ট্র্যাক করুন" : "Track Order"}</h1>
      <p className="text-xs text-mute mb-4">
        {bn ? "অর্ডার নম্বর (যেমন JH1234567890) আর অর্ডারের মোবাইল নম্বর দিন।" : "Enter your order number and the mobile number used for the order."}
      </p>

      <form onSubmit={submit} className="space-y-3">
        <input
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          placeholder={bn ? "অর্ডার নম্বর" : "Order ID"}
          className="input"
          autoCapitalize="characters"
        />
        <input
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder={bn ? "মোবাইল নম্বর" : "Your phone number"}
          inputMode="tel"
          className="input"
        />
        <button
          type="submit"
          disabled={loading}
          className="press w-full bg-orange text-white font-bold text-sm py-3.5 rounded-xl disabled:opacity-60"
        >
          {loading ? (bn ? "খুঁজছি..." : "Searching...") : bn ? "ট্র্যাক করুন" : "Track Order"}
        </button>
      </form>

      {notFound && (
        <div className="mt-5 bg-orange-tint text-orange rounded-xl p-3 text-sm font-semibold">
          {bn ? "এই অর্ডার নম্বর আর মোবাইল দিয়ে কোনো অর্ডার পাওয়া যায়নি। আবার মিলিয়ে দেখুন।" : "No order found for this order number and phone. Please check and try again."}
        </div>
      )}

      {result && (
        <div className="mt-5 bg-white border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-sm">{result.order_number}</div>
              <div className="text-[11px] text-mute">{formatDate(result.created_at, lang)}</div>
            </div>
            <div className="font-extrabold text-teal-dark">{money(result.total)}</div>
          </div>

          {cancelled ? (
            <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
              <XCircle size={18} /> {result.status === "returned" ? (bn ? "ফেরত এসেছে" : "Returned") : bn ? "অর্ডার বাতিল হয়েছে" : "Order cancelled"}
            </div>
          ) : (
            <div className="space-y-3">
              {FLOW.map((s, i) => {
                const Icon = s.icon;
                const reached = i <= stepIndex;
                return (
                  <div key={s.key} className={`flex items-center gap-3 ${reached ? "text-teal-dark" : "text-gray-400"}`}>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center ${reached ? "bg-teal-tint" : "bg-gray-100"}`}>
                      <Icon size={16} />
                    </span>
                    <span className={`text-sm ${i === stepIndex ? "font-extrabold" : "font-semibold"}`}>{bn ? s.bn : s.en}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 border-t border-border pt-3 space-y-2">
            {result.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-ink line-clamp-2">{it.name}</div>
                  <div className="text-mute">
                    {[it.size, it.color].filter(Boolean).join(" · ")} {it.size || it.color ? "· " : ""}× {it.quantity}
                  </div>
                </div>
                <div className="font-bold shrink-0">{money(Number(it.line_total))}</div>
              </div>
            ))}
            <div className="flex justify-between text-xs text-mute pt-1">
              <span>{bn ? "ডেলিভারি চার্জ" : "Delivery"}</span>
              <span>{Number(result.delivery_charge) === 0 ? (bn ? "ফ্রি" : "Free") : money(Number(result.delivery_charge))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
