import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowRight } from "lucide-react";
import type { Category } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

const GRADIENTS = [
  "from-[#0C7C72] to-[#2BB3A3]",
  "from-[#C2410C] to-[#FB923C]",
  "from-[#5B4BD5] to-[#A29BFE]",
  "from-[#BE185D] to-[#F472B6]",
  "from-[#0369A1] to-[#38BDF8]",
  "from-[#047857] to-[#34D399]"
];

const GOLD = "#E2B04A";

/** হোম/ক্যাটাগরি পেইজের ক্যাটাগরি কার্ড। অ্যাডমিন থেকে যোগ/বন্ধ/সাজালে এখানে সাথে সাথে বদলায়। */
export default function CategoryShowcase({
  categories,
  images
}: {
  categories: Category[];
  images: Record<string, string>;
}) {
  const { lang, pick } = useLanguage();
  const navigate = useNavigate();
  const tops = categories.filter((c) => !c.parent_id && c.slug !== "all");

  if (tops.length === 0) return null;

  return (
    <section className="mt-6 px-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-5 rounded-full" style={{ background: GOLD }} />
        <h2 className="font-extrabold text-[17px] text-ink">
          {lang === "bn" ? "ক্যাটাগরি অনুযায়ী কিনুন" : "Shop by Category"}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tops.map((c, i) => {
          const subs = categories.filter((k) => k.parent_id === c.id);
          const grad = GRADIENTS[i % GRADIENTS.length];
          const name = pick(c, "name");
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/categories?c=${c.slug}`)}
              className="press group relative text-left rounded-[20px] overflow-hidden aspect-[4/3] bg-[#101418]"
              style={{
                border: `1.5px solid ${GOLD}66`,
                boxShadow: "0 6px 18px rgba(0,0,0,0.22)"
              }}
            >
              {images[c.id] ? (
                <img
                  src={images[c.id]}
                  alt={name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-active:scale-105"
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${grad} flex items-center justify-center`}>
                  {c.icon ? <span className="text-5xl opacity-90">{c.icon}</span> : <ShoppingBag className="text-white/70" size={44} />}
                </div>
              )}

              {/* লেখা যেন পরিষ্কার পড়া যায়: নিচে গাঢ় ছায়া */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5" />

              {/* উপরে বাঁয়ে আইকন */}
              {c.icon && (
                <span
                  className="absolute top-2.5 left-2.5 w-9 h-9 rounded-xl flex items-center justify-center text-lg backdrop-blur-sm"
                  style={{ background: "rgba(0,0,0,0.45)", border: `1px solid ${GOLD}80` }}
                >
                  {c.icon}
                </span>
              )}

              {/* উপরে ডানে বিভাগ সংখ্যা */}
              {subs.length > 0 && (
                <span
                  className="absolute top-2.5 right-2.5 text-[10.5px] font-bold px-2 py-1 rounded-full backdrop-blur-sm"
                  style={{ background: "rgba(0,0,0,0.5)", color: GOLD, border: `1px solid ${GOLD}55` }}
                >
                  {lang === "bn" ? `${subs.length}টি বিভাগ` : `${subs.length} sections`}
                </span>
              )}

              {/* নিচে নাম + তীর */}
              <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="font-extrabold text-[17px] text-white leading-tight line-clamp-2"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}
                  >
                    {name}
                  </div>
                  <div className="mt-1.5 h-[2px] w-9 rounded-full" style={{ background: GOLD }} />
                </div>
                <span
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, #F6D77A, ${GOLD})` }}
                >
                  <ArrowRight size={16} className="text-black" strokeWidth={2.8} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
