import React, { useState } from "react";
import type { Category } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

export default function CategoryMenu({
  categories,
  activeIds,
  onSelect
}: {
  categories: Category[];
  activeIds: string[] | null;
  onSelect: (ids: string[] | null) => void;
}) {
  const { pick } = useLanguage();
  const topLevel = categories.filter((c) => !c.parent_id && c.slug !== "all");
  const [expandedTopId, setExpandedTopId] = useState<string | null>(null);

  const children = expandedTopId ? categories.filter((c) => c.parent_id === expandedTopId) : [];

  function selectAll() {
    setExpandedTopId(null);
    onSelect(null);
  }

  function selectTop(top: Category) {
    const kids = categories.filter((c) => c.parent_id === top.id);
    if (kids.length > 0) {
      setExpandedTopId(top.id);
      onSelect([top.id, ...kids.map((k) => k.id)]);
    } else {
      setExpandedTopId(null);
      onSelect([top.id]);
    }
  }

  function selectChild(child: Category) {
    onSelect([child.id]);
  }

  function selectAllChildrenOfExpanded() {
    if (!expandedTopId) return;
    const kids = categories.filter((c) => c.parent_id === expandedTopId);
    onSelect([expandedTopId, ...kids.map((k) => k.id)]);
  }

  function isTopActive(top: Category) {
    if (!activeIds) return false;
    const kids = categories.filter((c) => c.parent_id === top.id).map((k) => k.id);
    return activeIds.includes(top.id) || kids.some((k) => activeIds.includes(k));
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={selectAll}
          className={`press shrink-0 text-[12.5px] font-semibold px-4 py-2 rounded-full border ${
            activeIds === null ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
          }`}
        >
          {pick({ name_en: "All", name_bn: "সব পণ্য" }, "name")}
        </button>
        {topLevel.map((c) => (
          <button
            key={c.id}
            onClick={() => selectTop(c)}
            className={`press shrink-0 text-[12.5px] font-semibold px-4 py-2 rounded-full border ${
              isTopActive(c) ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
            }`}
          >
            {pick(c, "name")}
          </button>
        ))}
      </div>

      {expandedTopId && children.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 -mt-1 no-scrollbar" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={selectAllChildrenOfExpanded}
            className={`press shrink-0 text-[11.5px] font-semibold px-3 py-1.5 rounded-full border ${
              activeIds && activeIds.length > 1 ? "bg-orange text-white border-orange" : "bg-white text-mute border-border"
            }`}
          >
            {pick({ name_en: "All", name_bn: "সব" }, "name")}
          </button>
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => selectChild(c)}
              className={`press shrink-0 text-[11.5px] font-semibold px-3 py-1.5 rounded-full border ${
                activeIds && activeIds.length === 1 && activeIds[0] === c.id
                  ? "bg-orange text-white border-orange"
                  : "bg-white text-mute border-border"
              }`}
            >
              {pick(c, "name")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
