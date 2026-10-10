import type { OrderItem } from "../types";

/** অর্ডারের পণ্যের ছবি: ভ্যারিয়েন্টের ছবি, না থাকলে পণ্যের মূল ছবি। */
export function orderItemImage(it: OrderItem): string | null {
  const v = it.product_variants?.image_url;
  if (v) return v;
  const imgs = it.products?.product_images ?? [];
  if (imgs.length === 0) return null;
  const main = imgs.find((i) => i.is_main) ?? [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0];
  return main.thumbnail_url ?? main.url;
}

export const ORDER_ITEMS_SELECT =
  "*, order_items(*, product_variants(image_url), products(product_images(url, thumbnail_url, is_main, sort_order)))";
