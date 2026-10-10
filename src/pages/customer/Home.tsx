import React, { useEffect, useState } from "react";
import { productService } from "../../services/productService";
import CategoryShowcase from "../../components/CategoryShowcase";
import { loadCategoryImages } from "../../services/categoryImages";
import HeroSlider from "../../components/HeroSlider";
import NoticeTicker from "../../components/NoticeTicker";
import RecentOrderNotice from "../../components/RecentOrderNotice";
import { ErrorState } from "../../components/EmptyState";
import type { Category } from "../../types";

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [catImages, setCatImages] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);

  async function load() {
    setError(false);
    try {
      const cats = (await productService.listCategories()) as Category[];
      setCategories(cats);
      loadCategoryImages(cats).then(setCatImages).catch(() => {});
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorState onRetry={load} />;

  return (
    <div className="pb-4">
      <HeroSlider table="banners" />
      <NoticeTicker />
      <HeroSlider table="featured_banners" />
      <RecentOrderNotice />

      <CategoryShowcase categories={categories} images={catImages} />
    </div>
  );
}
