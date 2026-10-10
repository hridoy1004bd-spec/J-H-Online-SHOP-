import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, ChevronRight } from "lucide-react";
import type { Category } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

const GRADIENTS = [
  "from-teal to-[#2BB3A3]",
  "from-orange to-[#FFA24C]",
  "from-[#6C5CE7] to-[#A29BFE]",
  "from-[#E84393] to-[#FD79A8]",
  "from-[#0984E3] to-[#74B9FF]",
  "from-[#00B894] to-[#55EFC4]"
];

/** হোম/ক্যাটাগরি পেইজের সুন্দর ক্যাটাগরি কার্ড। অ্যাডমিন থেকে যোগ/বন্ধ/সাজালে এখানে সাথে সাথে বদলায়। */
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
        <span className="w-1 h-5 rounded-full bg-orange" />
        <h2 className="font-extrabold text-[17px] text-ink">
          {lang === "bn" ? "ক্যাটাগরি অনুযায়ী কিনুন" : "Shop by Category"}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tops.map((c, i) => {
          const subs = categories.filter((k) => k.parent_id === c.id);
          const grad = GRADIENTS[i % GRADIENTS.length];
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/categories?c=${c.slug}`)}
              className="press relative text-left rounded-2xl overflow-hidden shadow-md aspect-[4/5] bg-teal-tint"
            >
              {images[c.id] ? (
                <img src={images[c.id]} alt={pick(c, "name")} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${grad} flex items-center justify-center`}>
                  {c.icon ? <span className="text-5xl">{c.icon}</span> : <ShoppingBag className="text-white/70" size={44} />}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              {c.icon && images[c.id] && (
                <span className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-base shadow">
                  {c.icon}
                </span>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="font-extrabold text-[15px] text-white leading-tight drop-shadow line-clamp-2">{pick(c, "name")}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-white/85 font-semibold">
                  <span>
                    {subs.length > 0
                      ? lang === "bn"
                        ? `${subs.length}টি বিভাগ`
                        : `${subs.length} sections`
                      : lang === "bn"
                      ? "সব দেখুন"
                      : "View all"}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-orange flex items-center justify-center">
                    <ChevronRight size={13} className="text-white" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
