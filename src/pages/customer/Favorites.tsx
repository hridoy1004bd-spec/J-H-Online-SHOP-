import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { productService } from "../../services/productService";
import { useFavorites } from "../../utils/favorites";
import { useLanguage } from "../../i18n/LanguageContext";
import ProductCard from "../../components/ProductCard";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import type { Product } from "../../types";

export default function Favorites() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { ids } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const key = ids.join(",");

  useEffect(() => {
    let active = true;
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    productService
      .getByIds(ids)
      .then((list) => {
        if (!active) return;
        const order = new Map(ids.map((id, i) => [id, i]));
        setProducts([...list].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
      })
      .catch(() => {
        if (active) setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="px-4 py-4">
      <h1 className="font-extrabold text-lg mb-3">{lang === "bn" ? "পছন্দের পণ্য" : "My Favourites"}</h1>

      {loading ? (
        <LineSkeleton className="h-48 w-full" />
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-teal-tint mx-auto flex items-center justify-center mb-3">
            <Heart size={28} className="text-teal" />
          </div>
          <div className="font-bold text-sm mb-1">{lang === "bn" ? "এখনও কোনো পছন্দের পণ্য নেই" : "No favourites yet"}</div>
          <div className="text-xs text-mute mb-4">
            {lang === "bn" ? "পণ্যের ছবির উপরের ♡ চাপলে এখানে জমা হবে।" : "Tap the ♡ on any product to save it here."}
          </div>
          <button onClick={() => navigate("/")} className="press bg-teal text-white text-sm font-bold px-5 py-2.5 rounded-xl">
            {lang === "bn" ? "পণ্য দেখুন" : "Browse products"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
