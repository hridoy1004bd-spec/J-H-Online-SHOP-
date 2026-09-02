import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import type { Product } from "../types";
import { discountPct, mainImage, stockForVariant } from "../services/productService";
import { useLanguage } from "../i18n/LanguageContext";
import { money } from "../utils/format";

export default function ProductCard({ product }: { product: Product }) {
  const { t, pick } = useLanguage();
  const navigate = useNavigate();
  const image = mainImage(product);
  const discount = discountPct(product.old_price, product.current_price);
  const stock = stockForVariant(product, null);
  const outOfStock = stock <= 0;

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="press cursor-pointer bg-white rounded-2xl border border-border overflow-hidden flex flex-col"
    >
      <div className="relative aspect-square bg-teal-tint flex items-center justify-center overflow-hidden">
        {image ? (
          <img src={image} alt={pick(product, "name")} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ShoppingBag className="text-teal/40" size={40} />
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-orange text-white text-[10px] font-bold px-2 py-1 rounded-full">
            {discount}% {t("off")}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">{t("outOfStock")}</span>
          </div>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <div className="text-[12.5px] font-semibold text-ink line-clamp-2 leading-snug min-h-[32px]">
          {pick(product, "name")}
        </div>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-[14px] font-extrabold text-teal-dark">{money(product.current_price)}</span>
          {product.old_price > product.current_price && (
            <span className="text-[11px] text-mute line-through">{money(product.old_price)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
