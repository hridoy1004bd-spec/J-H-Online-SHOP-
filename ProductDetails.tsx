import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBag, Truck, RotateCcw } from "lucide-react";
import { productService, discountPct, stockForVariant } from "../../services/productService";
import { useLanguage } from "../../i18n/LanguageContext";
import { useCart } from "../../contexts/CartContext";
import { useToast } from "../../contexts/ToastContext";
import { money } from "../../utils/format";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import ProductCard from "../../components/ProductCard";
import type { Product } from "../../types";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { t, lang, pick } = useLanguage();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productService
      .getById(id)
      .then((p) => {
        setProduct(p);
        setActiveImg(0);
        setSize(null);
        setColor(null);
        setQty(1);
        return productService.getRelated(p.category_id, p.id);
      })
      .then(setRelated)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !product) {
    return (
      <div className="p-4 space-y-3">
        <LineSkeleton className="h-80 w-full" />
        <LineSkeleton className="h-5 w-2/3" />
        <LineSkeleton className="h-4 w-1/3" />
      </div>
    );
  }

  const images = product.product_images?.length ? product.product_images : [];
  const sizes = [...new Set((product.product_variants ?? []).map((v) => v.size).filter(Boolean))] as string[];
  const colors = [...new Set((product.product_variants ?? []).map((v) => v.color).filter(Boolean))] as string[];
  const selectedVariant = (product.product_variants ?? []).find(
    (v) => (sizes.length === 0 || v.size === size) && (colors.length === 0 || v.color === color)
  );
  const variantId = selectedVariant?.id ?? null;
  const stock = stockForVariant(product, variantId);
  const discount = discountPct(product.old_price, product.current_price);

  function requireSelection() {
    if (sizes.length > 0 && !size) {
      showToast(t("selectSize"), "error");
      return false;
    }
    return true;
  }

  function buildCartLine() {
    return {
      productId: product!.id,
      variantId,
      name_en: product!.name_en,
      name_bn: product!.name_bn,
      image: images[0]?.url ?? null,
      size,
      color,
      price: product!.current_price,
      oldPrice: product!.old_price,
      quantity: qty,
      maxStock: stock
    };
  }

  function handleAddToCart() {
    if (!requireSelection()) return;
    addItem(buildCartLine());
    showToast(t("addToCart") + " ✓");
  }

  function handleBuyNow() {
    if (!requireSelection()) return;
    addItem(buildCartLine());
    navigate("/checkout");
  }

  return (
    <div className="pb-4">
      <div className="relative bg-teal-tint">
        <button onClick={() => navigate(-1)} className="press absolute top-3 left-3 z-10 bg-white/90 rounded-full p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="aspect-square flex items-center justify-center overflow-hidden">
          {images.length > 0 ? (
            <img src={images[activeImg]?.url} alt={pick(product, "name")} className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag className="text-teal/30" size={64} />
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImg(i)}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 ${
                  i === activeImg ? "border-teal" : "border-transparent"
                }`}
              >
                <img src={img.thumbnail_url ?? img.url} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        <h1 className="font-extrabold text-lg text-ink leading-snug">{pick(product, "name")}</h1>
        {product.product_code && <div className="text-xs text-mute mt-1">{t("productCode")}: {product.product_code}</div>}

        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-xl font-extrabold text-teal-dark">{money(product.current_price)}</span>
          {product.old_price > product.current_price && (
            <>
              <span className="text-sm text-mute line-through">{money(product.old_price)}</span>
              <span className="text-xs font-bold text-orange">{discount}% {t("off")}</span>
            </>
          )}
        </div>

        <div className="mt-2">
          {stock > 0 ? (
            <span className="text-xs font-semibold text-green-600">{t("inStock")}</span>
          ) : (
            <span className="text-xs font-semibold text-red-500">{t("outOfStock")}</span>
          )}
        </div>

        {sizes.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-bold text-mute mb-2">{t("size")}</div>
            <div className="flex gap-2 flex-wrap">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`press px-4 py-1.5 rounded-lg text-sm font-semibold border ${
                    size === s ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {colors.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-bold text-mute mb-2">{t("color")}</div>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`press px-4 py-1.5 rounded-lg text-sm font-semibold border ${
                    color === c ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="text-xs font-bold text-mute mb-2">{t("quantity")}</div>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="press w-9 h-9 rounded-full border border-border flex items-center justify-center">
              <Minus size={15} />
            </button>
            <span className="font-bold w-6 text-center">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(stock || 99, q + 1))}
              className="press w-9 h-9 rounded-full border border-border flex items-center justify-center"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {product.description_en && (
          <div className="mt-5">
            <div className="text-xs font-bold text-mute mb-1.5">{t("description")}</div>
            <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">{pick(product, "description")}</p>
          </div>
        )}

        <div className="mt-5 space-y-2">
          <div className="flex items-start gap-2 bg-teal-tint rounded-xl p-3">
            <Truck size={16} className="text-teal shrink-0 mt-0.5" />
            <div className="text-xs text-ink/80">
              <div className="font-bold mb-0.5">{t("deliveryInfo")}</div>
              {lang === "bn" ? "ঢাকার ভিতরে: ৳৬০ (২-৩ দিন) · ঢাকার বাইরে: ৳১২০ (৩-৫ দিন)" : "Inside Dhaka: ৳60 (2-3 days) · Outside Dhaka: ৳120 (3-5 days)"}
            </div>
          </div>
          <div className="flex items-start gap-2 bg-orange-tint rounded-xl p-3">
            <RotateCcw size={16} className="text-orange shrink-0 mt-0.5" />
            <div className="text-xs text-ink/80">
              <div className="font-bold mb-0.5">{t("returnPolicy")}</div>
              {lang === "bn" ? "পণ্যে ত্রুটি থাকলে সহজ ৩ দিনের এক্সচেঞ্জ।" : "Easy 3-day exchange if the product has a defect."}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-6">
            <div className="font-extrabold text-[15px] mb-3">{t("relatedProducts")}</div>
            <div className="grid grid-cols-2 gap-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-border px-4 py-3 flex gap-3 z-30 safe-bottom">
        <button
          onClick={handleAddToCart}
          disabled={stock <= 0}
          className="press flex-1 bg-teal-tint text-teal-dark font-bold text-sm py-3 rounded-xl disabled:opacity-40"
        >
          {t("addToCart")}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={stock <= 0}
          className="press flex-1 bg-orange text-white font-bold text-sm py-3 rounded-xl disabled:opacity-40"
        >
          {t("buyNow")}
        </button>
      </div>
    </div>
  );
}
