import React, { useEffect, useState } from "react";
import { Gift, Copy, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { money, formatDate } from "../../utils/format";

interface GiftCardRow {
  id: string;
  code: string;
  amount: number;
  status: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  created_at: string;
}

const DENOMINATIONS = [100, 200, 500, 1000];

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    if (i === 5) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return "GIFT-" + code;
}

export default function GiftCards() {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [cards, setCards] = useState<GiftCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function loadCards() {
    setLoading(true);
    const { data } = await supabase
      .from("gift_cards")
      .select("*")
      .order("created_at", { ascending: false });
    setCards((data as GiftCardRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCards();
  }, []);

  const finalAmount = selectedAmount ?? Number(customAmount) || 0;

  async function handleCreate() {
    if (finalAmount <= 0) {
      showToast(lang === "en" ? "Enter a valid amount" : "সঠিক পরিমাণ লিখুন", "error");
      return;
    }
    setCreating(true);
    const code = generateCode();
    const { error } = await supabase.from("gift_cards").insert({
      code,
      amount: finalAmount,
      status: "active"
    });
    setCreating(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast(
      lang === "en" ? `Gift card created: ${code}` : `গিফট কার্ড তৈরি হয়েছে: ${code}`,
      "success"
    );
    setCustomAmount("");
    loadCards();
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    showToast(lang === "en" ? "Code copied" : "কোড কপি হয়েছে", "success");
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const activeCount = cards.filter((c) => c.status === "active").length;
  const redeemedCount = cards.filter((c) => c.status === "redeemed").length;

  return (
    <div className="pb-10">
      <h1 className="font-extrabold text-lg mb-4 flex items-center gap-2">
        <Gift size={20} className="text-orange" />
        {lang === "en" ? "Gift Cards" : "গিফট কার্ড"}
      </h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-border rounded-xl p-3">
          <div className="text-xs text-mute font-bold mb-1">{lang === "en" ? "Active" : "সক্রিয়"}</div>
          <div className="text-xl font-extrabold text-teal-dark">{activeCount}</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-3">
          <div className="text-xs text-mute font-bold mb-1">{lang === "en" ? "Redeemed" : "ব্যবহৃত"}</div>
          <div className="text-xl font-extrabold text-mute">{redeemedCount}</div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-4 mb-5">
        <div className="text-sm font-bold mb-3">
          {lang === "en" ? "Create New Gift Card" : "নতুন গিফট কার্ড তৈরি করুন"}
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {DENOMINATIONS.map((d) => (
            <button
              key={d}
              onClick={() => {
                setSelectedAmount(d);
                setCustomAmount("");
              }}
              className={`press text-sm font-bold py-2.5 rounded-xl border ${
                selectedAmount === d ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
              }`}
            >
              ৳{d}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <label className="text-xs font-bold text-mute mb-1.5 block">
            {lang === "en" ? "Or enter custom amount" : "অথবা নিজে পরিমাণ লিখুন"}
          </label>
          <input
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value.replace(/\D/g, ""));
              setSelectedAmount(null);
            }}
            placeholder={lang === "en" ? "e.g. 750" : "যেমন: ৭৫০"}
            inputMode="numeric"
            className="input"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={creating || finalAmount <= 0}
          className="press w-full bg-orange text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60"
        >
          {creating
            ? lang === "en"
              ? "Creating..."
              : "তৈরি হচ্ছে..."
            : lang === "en"
            ? `Generate ৳${finalAmount || 0} Gift Card`
            : `৳${finalAmount || 0} গিফট কার্ড তৈরি করুন`}
        </button>
      </div>

      <div className="text-xs font-bold text-mute uppercase mb-2">
        {lang === "en" ? "All Gift Cards" : "সব গিফট কার্ড"} ({cards.length})
      </div>

      {loading ? (
        <div className="text-sm text-mute text-center py-8">{lang === "en" ? "Loading..." : "লোড হচ্ছে..."}</div>
      ) : cards.length === 0 ? (
        <div className="text-sm text-mute text-center py-8">
          {lang === "en" ? "No gift cards yet" : "এখনো কোনো গিফট কার্ড নেই"}
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((c) => (
            <div key={c.id} className="bg-white border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-sm tracking-wide">{c.code}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.status === "active" ? "bg-teal-tint text-teal-dark" : "bg-gray-100 text-mute"
                  }`}
                >
                  {c.status === "active" ? (lang === "en" ? "Active" : "সক্রিয়") : lang === "en" ? "Redeemed" : "ব্যবহৃত"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold text-orange">{money(c.amount)}</span>
                {c.status === "active" ? (
                  <button
                    onClick={() => copyCode(c.code)}
                    className="press flex items-center gap-1 text-xs font-bold text-teal-dark bg-teal-tint px-3 py-1.5 rounded-full"
                  >
                    {copiedCode === c.code ? <Check size={13} /> : <Copy size={13} />}
                    {lang === "en" ? "Copy" : "কপি"}
                  </button>
                ) : (
                  <span className="text-[11px] text-mute">
                    {c.redeemed_at ? formatDate(c.redeemed_at, lang) : ""}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-mute mt-1">
                {lang === "en" ? "Created" : "তৈরি"}: {formatDate(c.created_at, lang)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
