import React from "react";
import type { Category } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

export default function CategoryMenu({
  categories,
  activeId,
  onSelect
}: {
  categories: Category[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { pick } = useLanguage();

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar" style={{ scrollbarWidth: "none" }}>
      <button
        onClick={() => onSelect(null)}
        className={`press shrink-0 text-[12.5px] font-semibold px-4 py-2 rounded-full border ${
          activeId === null ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
        }`}
      >
        {pick({ name_en: "All", name_bn: "সব পণ্য" }, "name")}
      </button>
      {categories
        .filter((c) => c.slug !== "all")
        .map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`press shrink-0 text-[12.5px] font-semibold px-4 py-2 rounded-full border ${
              activeId === c.id ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
            }`}
          >
            {pick(c, "name")}
          </button>
        ))}
    </div>
  );
}
