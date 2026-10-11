import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, BadgeCheck, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../i18n/LanguageContext";
import Stars from "./Stars";

export interface ShopReview {
  id: string;
  display_name: string;
  location: string | null;
  rating: number;
  body: string;
  verified: boolean;
  created_at: string;
}

export function Avatar({ name }: { name: string }) {
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <div className="w-11 h-11 rounded-full bg-teal text-white flex items-center justify-center font-extrabold text-base shrink-0">
      {letter}
    </div>
  );
}

export function ReviewCard({ r, lang }: { r: ShopReview; lang: "bn" | "en" }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <Avatar name={r.display_name} />
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-[14px] text-ink truncate">{r.display_name}</div>
          {r.location && (
            <div className="flex items-center gap-1 text-[11.5px] text-mute">
              <MapPin size={11} /> {r.location}
            </div>
          )}
        </div>
        <Stars value={r.rating} size={14} />
      </div>
      <p className="text-[13px] text-ink/85 leading-relaxed whitespace-pre-line">{r.body}</p>
      {r.verified && (
        <div className="inline-flex items-center gap-1 mt-3 text-[11px] font-bold text-teal-dark bg-teal-tint rounded-full px-2.5 py-1">
          <BadgeCheck size={13} /> {lang === "en" ? "Verified Purchase" : "ভেরিফায়েড ক্রেতা"}
        </div>
      )}
    </div>
  );
}

export default function ReviewsSection() {
  const { lang } = useLanguage();
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    supabase
      .from("shop_reviews")
      .select("id, display_name, location, rating, body, verified, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setReviews((data as ShopReview[]) ?? []));
  }, []);

  useEffect(() => {
    if (reviews.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % reviews.length), 7000);
    return () => clearInterval(t);
  }, [reviews.length]);

  if (reviews.length === 0) return null;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const cur = reviews[idx % reviews.length];

  return (
    <section className="mt-8 px-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="font-extrabold text-[15px] text-ink flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-orange" />
            {lang === "en" ? "What our customers say" : "আমাদের কাস্টমাররা কী বলছেন"}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Stars value={Math.round(avg)} size={14} />
            <span className="text-xs font-bold text-ink">{avg.toFixed(1)}</span>
            <span className="text-xs text-mute">({reviews.length})</span>
          </div>
        </div>
        <Link to="/reviews" className="text-[12px] font-bold text-orange">
          {lang === "en" ? "All reviews ›" : "সব রিভিউ ›"}
        </Link>
      </div>

      <ReviewCard r={cur} lang={lang} />

      {reviews.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-3">
          <button
            onClick={() => setIdx((idx - 1 + reviews.length) % reviews.length)}
            className="press w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs text-mute font-semibold">
            {(idx % reviews.length) + 1} / {reviews.length}
          </span>
          <button
            onClick={() => setIdx((idx + 1) % reviews.length)}
            className="press w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
