import React, { useEffect, useState } from "react";
import { productService } from "../../services/productService";
import ProductCard from "../../components/ProductCard";
import CategoryMenu from "../../components/CategoryMenu";
import BannerSlider from "../../components/BannerSlider";
import FeaturedBannerSlider from "../../components/FeaturedBannerSlider";
import NoticeTicker from "../../components/NoticeTicker";
import { ProductGridSkeleton } from "../../components/LoadingSkeleton";
import { ErrorState } from "../../components/EmptyState";
import { useLanguage } from "../../i18n/LanguageContext";
import type { Category, Product } from "../../types";

function Section({ title, products }: { title: string; products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="mt-6">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="font-extrabold text-[15px] text-ink">{title}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [cats, general, arrivals, best, feat] = await Promise.all([
        productService.listCategories(),
        productService.list({ categoryId: activeCategory ?? undefined, pageSize: 12 }),
        productService.list({ newArrivals: true, pageSize: 8 }),
        productService.list({ bestSeller: true, pageSize: 8 }),
        productService.list({ featured: true, pageSize: 8 })
      ]);
      setCategories(cats as Category[]);
      setAllProducts(general.products);
      setNewArrivals(arrivals.products);
      setBestSellers(best.products);
      setFeatured(feat.products);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  if (error) return <ErrorState onRetry={load} />;

  return (
    <div className="pb-4">
      <BannerSlider />
      <NoticeTicker />
      <FeaturedBannerSlider />

      <CategoryMenu categories={categories} activeId={activeCategory} onSelect={setActiveCategory} />

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : (
        <>
          <Section title={t("featured")} products={featured} />
          <Section title={t("newArrivals")} products={newArrivals} />
          <Section title={t("bestSelling")} products={bestSellers} />
          <Section title={activeCategory ? t("all") : t("recommended")} products={allProducts} />
        </>
      )}
    </div>
  );
}
