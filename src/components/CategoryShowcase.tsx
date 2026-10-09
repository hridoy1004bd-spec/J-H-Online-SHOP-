import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import type { Category } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

export default function CategoryShowcase({
  categories,
  images
}: {
  categories: Category[];
  images: Record<string, string>;
}) {
  const { lang, pick } = useLanguage();
  const navigate = useNavigate();
  const tops = categories.filter((c) => !c.parent_id && c.slug !== "all" && images[c.id]);

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
        {tops.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/categories?c=${c.slug}`)}
            className="press text-left bg-white rounded-2xl border border-border overflow-hidden shadow-sm"
          >
            <div className="aspect-[4/3] bg-teal-tint flex items-center justify-center overflow-hidden">
              {images[c.id] ? (
                <img src={images[c.id]} alt={pick(c, "name")} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag className="text-teal/40" size={36} />
              )}
            </div>
            <div className="px-3 py-2.5 font-bold text-[13.5px] text-ink truncate">{pick(c, "name")}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
