import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Package } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { money } from "../../utils/format";
import { mainImage, stockForVariant } from "../../services/productService";
import { EmptyState } from "../../components/EmptyState";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import type { Product } from "../../types";

export default function ProductList() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select(`*, product_images(*), product_variants(*), inventory(*)`)
      .order("created_at", { ascending: false });
    setProducts((data as unknown as Product[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(p: Product) {
    await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  }

  async function remove(p: Product) {
    if (!confirm(`${t("delete")} "${p.name_en}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return showToast(error.message, "error");
    showToast(t("delete") + " ✓");
    load();
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <LineSkeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState icon={Package} title={t("noProductsYet")} action={
      <button onClick={() => navigate("/admin/products/new")} className="press bg-teal text-white text-sm font-bold px-5 py-2.5 rounded-full">
        {t("addProduct")}
      </button>
    } />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-extrabold text-lg">{t("productList")}</h1>
        <button onClick={() => navigate("/admin/products/new")} className="press bg-teal text-white text-xs font-bold px-4 py-2 rounded-full">
          + {t("addProduct")}
        </button>
      </div>

      <div className="space-y-2">
        {products.map((p) => {
          const stock = stockForVariant(p, null);
          const image = mainImage(p);
          return (
            <div key={p.id} className="bg-white border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-teal-tint overflow-hidden shrink-0 flex items-center justify-center">
                {image ? <img src={image} className="w-full h-full object-cover" /> : <Package className="text-teal/40" size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{lang === "bn" ? p.name_bn : p.name_en}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-teal-dark">{money(p.current_price)}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stock > 0 ? "bg-teal-tint text-teal-dark" : "bg-red-50 text-red-500"}`}>
                    {stock > 0 ? `${stock} ${t("stockQty")}` : t("outOfStock")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => toggleActive(p)}
                className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${p.is_active ? "bg-teal-tint text-teal-dark" : "bg-gray-100 text-mute"}`}
              >
                {p.is_active ? t("activeProducts") : t("outOfStockCount")}
              </button>
              <button onClick={() => navigate(`/admin/products/${p.id}/edit`)} className="press shrink-0 text-mute">
                <Pencil size={16} />
              </button>
              <button onClick={() => remove(p)} className="press shrink-0 text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
