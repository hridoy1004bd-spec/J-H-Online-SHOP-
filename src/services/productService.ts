import { supabase } from "../lib/supabase";
import type { Product } from "../types";

const PRODUCT_SELECT = `
  *,
  product_images ( id, url, thumbnail_url, is_main, sort_order ),
  product_variants ( id, size, color ),
  inventory ( id, variant_id, quantity, reserved )
`;

export const productService = {
  async list(opts: {
    categoryId?: string | string[];
    featured?: boolean;
    newArrivals?: boolean;
    bestSeller?: boolean;
    search?: string;
    sort?: "newest" | "price_asc" | "price_desc";
    page?: number;
    pageSize?: number;
  } = {}) {
    const { page = 1, pageSize = 20 } = opts;
    let query = supabase.from("products").select(PRODUCT_SELECT, { count: "exact" }).eq("is_active", true);

    if (opts.categoryId) {
      if (Array.isArray(opts.categoryId)) {
        if (opts.categoryId.length > 0) query = query.in("category_id", opts.categoryId);
      } else {
        query = query.eq("category_id", opts.categoryId);
      }
    }
    if (opts.featured) query = query.eq("is_featured", true);
    if (opts.newArrivals) query = query.eq("is_new_arrival", true);
    if (opts.bestSeller) query = query.eq("is_best_seller", true);
    if (opts.search) {
      query = query.or(
        `name_en.ilike.%${opts.search}%,name_bn.ilike.%${opts.search}%,sku.ilike.%${opts.search}%,search_keywords.ilike.%${opts.search}%`
      );
    }

    if (opts.sort === "price_asc") query = query.order("current_price", { ascending: true });
    else if (opts.sort === "price_desc") query = query.order("current_price", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { products: (data ?? []) as unknown as Product[], total: count ?? 0 };
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).single();
    if (error) throw error;
    return data as unknown as Product;
  },

  async getRelated(categoryId: string | null, excludeId: string, limit = 6) {
    if (!categoryId) return [];
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .neq("id", excludeId)
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as Product[];
  },

  async listCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
};

export function stockForVariant(product: Product, variantId: string | null): number {
  const row = product.inventory?.find((i) => i.variant_id === variantId);
  if (row) return Math.max(0, row.quantity - row.reserved);
  const total = (product.inventory ?? []).reduce((s, i) => s + Math.max(0, i.quantity - i.reserved), 0);
  return total;
}

export function discountPct(oldPrice: number, price: number) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function mainImage(product: Product): string | null {
  const imgs = product.product_images ?? [];
  const main = imgs.find((i) => i.is_main) ?? imgs[0];
  return main?.url ?? null;
}
