import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { productService } from "../../services/productService";
import { loadCategoryImages } from "../../services/categoryImages";
import ProductCard from "../../components/ProductCard";
import CategoryShowcase from "../../components/CategoryShowcase";
import { ProductGridSkeleton } from "../../components/LoadingSkeleton";
import { useLanguage } from "../../i18n/LanguageContext";
import type { Category, Product } from "../../types";

const PAGE_SIZE = 20;

export default function Categories() {
  const { lang, pick } = useLanguage();
  const [params, setParams] = useSearchParams();
  const slug = params.get("c");

  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    productService.listCategories().then(async (c) => {
      const cats = c as Category[];
      setCategories(cats);
      setImages(await loadCategoryImages(cats));
    });
  }, []);

  const selected = categories.find((c) => c.slug === slug) ?? null;
  const activeTop = selected ? (selected.parent_id ? categories.find((c) => c.id === selected.parent_id) ?? null : selected) : null;
  const activeSub = selected && selected.parent_id ? selected : null;
  const kids = activeTop ? categories.filter((c) => c.parent_id === activeTop.id) : [];

  const ids: string[] | undefined = activeSub
    ? [activeSub.id]
    : activeTop
    ? [activeTop.id, ...kids.map((k) => k.id)]
    : undefined;
  const idsKey = ids ? ids.join(",") : "all";

  useEffect(() => {
    if (categories.length === 0) return;
    setLoading(true);
    setPage(1);
    productService
      .list({ categoryId: ids, pageSize: PAGE_SIZE, page: 1 })
      .then((r) => {
        setProducts(r.products);
        setTotal(r.total);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, categories.length]);

  async function loadMore() {
    const next = page + 1;
    setLoadingMore(true);
    try {
      const r = await productService.list({ categoryId: ids, pageSize: PAGE_SIZE, page: next });
      setProducts((prev) => [...prev, ...r.products]);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  }

  function choose(s: string | null) {
    if (s) setParams({ c: s });
    else setParams({});
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="pt-3 pb-4">
      {!activeTop && <CategoryShowcase categories={categories} images={images} />}

      <div className="px-4 mt-4 mb-2 font-extrabold text-[15px] text-ink">
        {activeSub ? pick(activeSub, "name") : activeTop ? pick(activeTop, "name") : lang === "bn" ? "সব পণ্য" : "All Products"}
        <span className="text-xs font-semibold text-mute ml-2">({total})</span>
      </div>

      {kids.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => activeTop && choose(activeTop.slug)}
            className={`press shrink-0 text-[12.5px] font-semibold px-4 py-2 rounded-full border ${
              !activeSub ? "bg-orange text-white border-orange" : "bg-white text-ink border-border"
            }`}
          >
            {lang === "bn" ? "সব" : "All"}
          </button>
          {kids.map((k) => (
            <button
              key={k.id}
              onClick={() => choose(k.slug)}
              className={`press shrink-0 text-[12.5px] font-semibold px-4 py-2 rounded-full border ${
                activeSub?.id === k.id ? "bg-orange text-white border-orange" : "bg-white text-ink border-border"
              }`}
            >
              {pick(k, "name")}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <ProductGridSkeleton count={6} />
      ) : products.length === 0 ? (
        <div className="text-center text-sm text-mute py-16 px-4">
          {lang === "bn" ? "এই ক্যাটাগরিতে এখনো কোনো পণ্য নেই" : "No products in this category yet"}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {products.length < total && (
            <div className="px-4 mt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="press w-full bg-teal-tint text-teal-dark font-bold text-sm py-3 rounded-xl disabled:opacity-60"
              >
                {loadingMore ? (lang === "bn" ? "লোড হচ্ছে..." : "Loading...") : lang === "bn" ? "আরো পণ্য দেখুন" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
