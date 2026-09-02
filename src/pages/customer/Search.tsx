import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import { productService } from "../../services/productService";
import ProductCard from "../../components/ProductCard";
import { ProductGridSkeleton } from "../../components/LoadingSkeleton";
import { EmptyState } from "../../components/EmptyState";
import { useLanguage } from "../../i18n/LanguageContext";
import type { Product } from "../../types";

export default function Search() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    productService
      .list({ search: q, pageSize: 40 })
      .then((r) => setProducts(r.products))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="pt-4">
      <div className="px-4 mb-3 text-sm text-mute">
        {t("searchResults")} <span className="font-bold text-ink">"{q}"</span>
      </div>
      {loading ? (
        <ProductGridSkeleton count={6} />
      ) : products.length === 0 ? (
        <EmptyState icon={SearchX} title={t("noResults")} />
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
