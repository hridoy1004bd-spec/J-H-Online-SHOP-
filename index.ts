export type Lang = "bn" | "en";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentMethod = "cod" | "bkash" | "nagad" | "rocket" | "card";

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  thumbnail_url: string | null;
  is_main: boolean;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
}

export interface InventoryRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  reserved: number;
}

export interface Product {
  id: string;
  sku: string | null;
  category_id: string | null;
  name_en: string;
  name_bn: string;
  description_en: string | null;
  description_bn: string | null;
  short_description_en: string | null;
  short_description_bn: string | null;
  brand: string | null;
  product_code: string | null;
  old_price: number;
  current_price: number;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
  inventory?: InventoryRow[];
}

export interface Customer {
  id: string;
  mobile: string;
  name: string;
  auth_user_id: string | null;
  is_verified: boolean;
}

export interface Address {
  id: string;
  customer_id: string;
  full_address: string;
  area: string | null;
  city: string;
  landmark: string | null;
  is_default: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  size: string | null;
  color: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  full_address: string;
  area: string | null;
  city: string;
  landmark: string | null;
  subtotal: number;
  discount: number;
  delivery_charge: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: string;
  status: OrderStatus;
  created_at: string;
  order_items?: OrderItem[];
}

export interface StoreSettings {
  id: number;
  store_name: string;
  logo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  currency: string;
  delivery_charge_inside_dhaka: number;
  delivery_charge_outside_dhaka: number;
  cod_enabled: boolean;
  dev_otp_mode: boolean;
}

// --- Client-side cart (persisted locally until checkout creates a real order) ---
export interface CartLine {
  productId: string;
  variantId: string | null;
  name_en: string;
  name_bn: string;
  image: string | null;
  size: string | null;
  color: string | null;
  price: number;
  oldPrice: number;
  quantity: number;
  maxStock: number;
}
