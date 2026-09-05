import React, { useEffect, useState } from "react";
import { productService } from "../../services/productService";
import ProductCard from "../../components/ProductCard";
import CategoryMenu from "../../components/CategoryMenu";
import { ProductGridSkeleton } from "../../components/LoadingSkeleton";
import type { Category, Product } from "../../types";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeIds, setActiveIds] = useState<string[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.listCategories().then((c) => setCategories(c as Category[]));
  }, []);

  useEffect(() => {
    setLoading(true);
    productService
      .list({ categoryId: activeIds ?? undefined, pageSize: 40 })
      .then((r) => setProducts(r.products))
      .finally(() => setLoading(false));
  }, [activeIds]);

  return (
    <div className="pt-2">
      <CategoryMenu categories={categories} activeIds={activeIds} onSelect={setActiveIds} />
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
