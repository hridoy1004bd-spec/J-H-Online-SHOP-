import { supabase } from "../lib/supabase";
import type { Category } from "../types";

/**
 * প্রতিটি ক্যাটাগরির ছবি: অ্যাডমিন নিজে ছবি দিলে সেটা, নয়তো ওই ক্যাটাগরির প্রথম পণ্যের ছবি।
 * মূল ক্যাটাগরির নিজের পণ্য না থাকলে তার সাব-ক্যাটাগরির ছবি নেয়।
 */
export async function loadCategoryImages(categories: Category[]): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("products")
    .select("category_id, product_images ( url, thumbnail_url, is_main, sort_order )")
    .eq("is_active", true)
    .not("category_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error || !data) return {};

  const map: Record<string, string> = {};
  // অ্যাডমিন যে ছবি নিজে দিয়েছে সেটাই আগে
  for (const c of categories) if (c.image_url) map[c.id] = c.image_url;
  for (const row of data as any[]) {
    const cid = row.category_id as string;
    if (map[cid]) continue;
    const imgs = (row.product_images ?? []) as { url: string; thumbnail_url: string | null; is_main: boolean; sort_order: number }[];
    if (imgs.length === 0) continue;
    const main = imgs.find((i) => i.is_main) ?? [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0];
    map[cid] = main.thumbnail_url ?? main.url;
  }

  for (const c of categories) {
    if (map[c.id]) continue;
    const kid = categories.find((k) => k.parent_id === c.id && map[k.id]);
    if (kid) map[c.id] = map[kid.id];
  }
  return map;
}
