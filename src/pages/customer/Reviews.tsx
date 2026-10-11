import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import Stars from "../../components/Stars";
import { ReviewCard } from "../../components/ReviewsSection";
import type { ShopReview } from "../../components/ReviewsSection";

export default function Reviews() {
  const { customer } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [sending, setSending] = useState(false);
  const [mine, setMine] = useState<{ id: string; status: string; body: string }[]>([]);

  async function load() {
    const { data } = await supabase
      .from("shop_reviews")
      .select("id, display_name, location, rating, body, verified, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(100);
    setReviews((data as ShopReview[]) ?? []);
    if (customer) {
      const { data: m } = await supabase
        .from("shop_reviews")
        .select("id, status, body")
        .eq("customer_id", customer.id)
        .neq("status", "approved")
        .order("created_at", { ascending: false });
      setMine((m as any[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  async function submit() {
    if (body.trim().length < 3) {
      return showToast(lang === "en" ? "Please write your review" : "রিভিউ লিখুন", "error");
    }
    setSending(true);
    const { data, error } = await supabase.rpc("submit_shop_review", {
      p_rating: rating,
      p_body: body.trim(),
      p_location: location.trim() || null
    });
    setSending(false);
    if (error || !data?.success) {
      const code = data?.error;
      const msg =
        code === "ALREADY_PENDING"
          ? lang === "en" ? "Your previous review is still waiting for approval" : "আপনার আগের রিভিউ এখনো অনুমোদনের অপেক্ষায় আছে"
          : code === "LIMIT"
          ? lang === "en" ? "You have reached the review limit" : "আপনি রিভিউ দেওয়ার সীমায় পৌঁছে গেছেন"
          : code === "LOGIN_REQUIRED"
          ? lang === "en" ? "Please login first" : "আগে লগইন করুন"
          : error?.message || (lang === "en" ? "Failed" : "ব্যর্থ হয়েছে");
      return showToast(msg, "error");
    }
    showToast(
      lang === "en" ? "Thank you! Your review will appear after approval." : "ধন্যবাদ! অনুমোদনের পর আপনার রিভিউ সাইটে দেখা যাবে।",
      "success"
    );
    setBody("");
    setLocation("");
    setRating(5);
    load();
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="font-extrabold text-lg mb-1">{lang === "en" ? "Customer Reviews" : "কাস্টমার রিভিউ"}</h1>
      {reviews.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Stars value={Math.round(avg)} size={16} />
          <span className="text-sm font-extrabold">{avg.toFixed(1)}</span>
          <span className="text-xs text-mute">
            ({reviews.length} {lang === "en" ? "reviews" : "টি রিভিউ"})
          </span>
        </div>
      )}

      <div className="bg-white border border-border rounded-2xl p-4 mb-5">
        <div className="font-extrabold text-sm mb-2">{lang === "en" ? "Write a review" : "আপনার রিভিউ লিখুন"}</div>
        {!customer ? (
          <div className="text-xs text-mute">
            {lang === "en" ? "Please login to write a review." : "রিভিউ লিখতে আগে লগইন করুন।"}
            <button onClick={() => navigate("/account")} className="press block mt-2 bg-teal text-white text-xs font-bold px-4 py-2 rounded-full">
              {lang === "en" ? "Login" : "লগইন করুন"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} className="press" aria-label={`${n} star`}>
                  <Star size={28} className={n <= rating ? "text-[#F5A623] fill-[#F5A623]" : "text-gray-300"} />
                </button>
              ))}
            </div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={lang === "en" ? "Your area (e.g. Cumilla)" : "আপনার এলাকা (যেমন: কুমিল্লা)"}
              className="input mb-2"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder={lang === "en" ? "Tell us about your experience" : "আমাদের সাথে আপনার অভিজ্ঞতা লিখুন"}
              className="input resize-none mb-3"
            />
            <button
              onClick={submit}
              disabled={sending}
              className="press w-full bg-orange text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60"
            >
              {sending ? (lang === "en" ? "Sending..." : "পাঠানো হচ্ছে...") : lang === "en" ? "Submit review" : "রিভিউ পাঠান"}
            </button>
            <div className="text-[11px] text-mute mt-2">
              {lang === "en"
                ? "Your review is shown on the site after our team approves it."
                : "আমাদের টিম অনুমোদন করলে আপনার রিভিউ সাইটে দেখা যাবে।"}
            </div>
            {mine.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {mine.map((m) => (
                  <div key={m.id} className="text-[11.5px] bg-orange-tint text-orange rounded-lg px-3 py-2 font-semibold">
                    {m.status === "pending"
                      ? lang === "en" ? "Waiting for approval: " : "অনুমোদনের অপেক্ষায়: "
                      : lang === "en" ? "Not published: " : "প্রকাশ হয়নি: "}
                    <span className="font-normal text-ink/70">{m.body.slice(0, 60)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {loading ? (
        <div className="text-center text-sm text-mute py-10">...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center text-sm text-mute py-10">
          {lang === "en" ? "No reviews yet. Be the first!" : "এখনো কোনো রিভিউ নেই। আপনিই প্রথম রিভিউ দিন!"}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} r={r} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}
