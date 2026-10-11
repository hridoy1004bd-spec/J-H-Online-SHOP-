import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Package, Search, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { money } from "../../utils/format";
import { mainImage, stockForVariant } from "../../services/productService";
import { EmptyState } from "../../components/EmptyState";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import type { Category, Product } from "../../types";

interface Group {
  key: string;
  title: string;
  topId: string | null;
  order: number;
  items: Product[];
}

export default function ProductList() {
  const { t, lang, pick } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [topFilter, setTopFilter] = useState<string>("all");
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const [{ data }, { data: cats }] = await Promise.all([
      supabase.from("products").select(`*, product_images(*), product_variants(*), inventory(*)`).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order")
    ]);
    setProducts((data as unknown as Product[]) ?? []);
    setCategories((cats as Category[]) ?? []);
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

  const tops = useMemo(() => categories.filter((c) => !c.parent_id && c.slug !== "all"), [categories]);

  const groups = useMemo<Group[]>(() => {
    const byId = new Map<string, Category>(categories.map((c) => [c.id, c] as [string, Category]));
    const q = query.trim().toLowerCase();
    const map = new Map<string, Group>();
    for (const p of products) {
      if (q) {
        const hay = `${p.name_bn} ${p.name_en} ${p.sku ?? ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const cat = p.category_id ? byId.get(p.category_id) : undefined;
      const top = cat ? (cat.parent_id ? byId.get(cat.parent_id) ?? cat : cat) : undefined;
      if (topFilter !== "all" && (top?.id ?? "none") !== topFilter) continue;
      const key = cat ? cat.id : "none";
      let g = map.get(key);
      if (!g) {
        const title = cat ? (top && top.id !== cat.id ? `${pick(top, "name")} › ${pick(cat, "name")}` : pick(cat, "name")) : lang === "bn" ? "ক্যাটাগরি নেই" : "No category";
        const topIdx = top ? categories.findIndex((c) => c.id === top.id) : 9999;
        const catIdx = cat ? categories.findIndex((c) => c.id === cat.id) : 9999;
        g = { key, title, topId: top?.id ?? null, order: topIdx * 1000 + (cat && top && top.id !== cat.id ? catIdx + 1 : 0), items: [] };
        map.set(key, g);
      }
      g.items.push(p);
    }
    const list = [...map.values()];
    list.forEach((g) => g.items.sort((a, b) => (a.name_bn || a.name_en).localeCompare(b.name_bn || b.name_en)));
    return list.sort((a, b) => a.order - b.order);
  }, [products, categories, query, topFilter, lang]);

  const shown = groups.reduce((s, g) => s + g.items.length, 0);

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
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-extrabold text-lg">
          {t("productList")} <span className="text-sm font-semibold text-mute">({shown})</span>
        </h1>
        <button onClick={() => navigate("/admin/products/new")} className="press bg-teal text-white text-xs font-bold px-4 py-2 rounded-full">
          + {t("addProduct")}
        </button>
      </div>

      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === "bn" ? "পণ্যের নাম বা SKU খুঁজুন" : "Search name or SKU"}
          className="input pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
        {[{ id: "all", name: lang === "bn" ? "সব" : "All" }, ...tops.map((c) => ({ id: c.id, name: pick(c, "name") })), { id: "none", name: lang === "bn" ? "ক্যাটাগরি নেই" : "No category" }].map((c) => (
          <button
            key={c.id}
            onClick={() => setTopFilter(c.id)}
            className={`press shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full border ${
              topFilter === c.id ? "bg-teal text-white border-teal" : "bg-white text-ink border-border"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center text-sm text-mute py-12">{lang === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}</div>
      )}

      <div className="space-y-4">
        {groups.map((g) => {
          const isClosed = !!closed[g.key];
          return (
            <div key={g.key}>
              <button
                onClick={() => setClosed({ ...closed, [g.key]: !isClosed })}
                className="press w-full flex items-center gap-2 bg-teal-tint text-teal-dark rounded-xl px-3 py-2.5 mb-2"
              >
                {isClosed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                <span className="font-extrabold text-[13.5px] flex-1 text-left">{g.title}</span>
                <span className="text-xs font-bold bg-white rounded-full px-2 py-0.5">{g.items.length}</span>
              </button>
              {!isClosed && (
                <div className="space-y-2">
                  {g.items.map((p) => {
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
