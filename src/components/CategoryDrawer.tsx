import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, LayoutGrid, ShoppingBag, ChevronRight } from "lucide-react";
import { productService } from "../services/productService";
import { loadCategoryImages } from "../services/categoryImages";
import { useLanguage } from "../i18n/LanguageContext";
import type { Category } from "../types";

export default function CategoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, pick, t } = useLanguage();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    productService.listCategories().then(async (c) => {
      const cats = c as Category[];
      setCategories(cats);
      setImages(await loadCategoryImages(cats));
    });
  }, [open, loaded]);

  const tops = categories.filter((c) => !c.parent_id && c.slug !== "all");

  function go(path: string) {
    navigate(path);
    onClose();
    window.scrollTo({ top: 0 });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      go(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex text-ink">
      <div className="w-[82%] max-w-sm h-full bg-white flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 font-extrabold text-[17px]">
            <LayoutGrid size={20} className="text-orange" />
            {t("categories")}
          </div>
          <button onClick={onClose} className="press text-mute p-1" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={submitSearch} className="px-4 py-3 bg-[#FBFCFC]">
          <div className="flex items-center bg-white border border-border rounded-full px-4 py-2.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPh")}
              className="flex-1 min-w-0 outline-none text-sm bg-transparent"
            />
            <button type="submit" className="text-mute" aria-label="Search">
              <Search size={18} />
            </button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2.5">
          <button
            onClick={() => go("/categories")}
            className="press w-full flex items-center gap-3 bg-white border border-border rounded-2xl px-3 py-2.5 shadow-sm"
          >
            <span className="w-11 h-11 rounded-full bg-teal-tint flex items-center justify-center shrink-0">
              <LayoutGrid size={18} className="text-teal-dark" />
            </span>
            <span className="flex-1 text-left font-bold text-[15px]">{lang === "bn" ? "সব পণ্য" : "All Products"}</span>
            <ChevronRight size={16} className="text-mute" />
          </button>

          {tops.map((c) => (
            <button
              key={c.id}
              onClick={() => go(`/categories?c=${c.slug}`)}
              className="press w-full flex items-center gap-3 bg-white border border-border rounded-2xl px-3 py-2.5 shadow-sm"
            >
              <span className="w-11 h-11 rounded-full overflow-hidden bg-teal-tint flex items-center justify-center shrink-0">
                {images[c.id] ? (
                  <img src={images[c.id]} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag size={16} className="text-teal/50" />
                )}
              </span>
              <span className="flex-1 text-left font-bold text-[15px] truncate">{pick(c, "name")}</span>
              <ChevronRight size={16} className="text-mute" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-black/45" onClick={onClose} />
    </div>
  );
}
