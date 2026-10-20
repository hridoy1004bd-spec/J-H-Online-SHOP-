import { supabase } from "../lib/supabase";

export interface DsPartner {
  id: string;
  user_id: string;
  name: string;
  mobile: string;
  code: string;
  status: "Pending" | "Approved" | "Rejected" | "Suspended";
  balance: number;
  created_at: string;
}
export interface DsSettings {
  enabled: boolean;
  delivery_charge: number;
  min_withdraw: number;
  notice: string;
  withdraw_note: string;
}
export interface DsProductImage {
  url: string;
  is_main: boolean;
  sort_order: number;
}
export interface DsProduct {
  product_id: string;
  wholesale: number;
  is_active: boolean;
  products?: { name_bn: string | null; name_en: string | null; current_price?: number; product_images?: DsProductImage[] } | null;
}
export interface DsMy {
  partner_id: string;
  product_id: string;
  sell_price: number;
}
export interface DsOrderItem {
  id: number;
  order_id: number;
  product_id: string;
  product_name: string;
  variant_note: string;
  qty: number;
  wholesale: number;
  sell: number;
}
export type DsOrderStatus = "Pending" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled" | "Returned";
export interface DsOrder {
  id: number;
  order_no: string;
  partner_id: string;
  source: "partner" | "link";
  customer_name: string;
  customer_mobile: string;
  address: string;
  note: string;
  delivery_charge: number;
  subtotal: number;
  wholesale_total: number;
  profit: number;
  status: DsOrderStatus;
  admin_note: string;
  profit_credited: boolean;
  created_at: string;
  ds_order_items?: DsOrderItem[];
}
export interface DsLedger {
  id: number;
  partner_id: string;
  type: string;
  amount: number;
  balance_after: number;
  ref: string;
  note: string;
  created_at: string;
}
export interface DsWithdrawal {
  id: number;
  partner_id: string;
  method: string;
  account: string;
  amount: number;
  status: "Pending" | "Paid" | "Rejected";
  note: string;
  created_at: string;
}

export const DS_STATUS_BN: Record<DsOrderStatus, string> = {
  Pending: "অপেক্ষমাণ",
  Confirmed: "নিশ্চিত",
  Shipped: "পাঠানো হয়েছে",
  Delivered: "ডেলিভারি সম্পন্ন",
  Cancelled: "বাতিল",
  Returned: "ফেরত"
};

export function statusClass(s: string): string {
  if (s === "Delivered" || s === "Paid" || s === "Approved") return "bg-emerald-50 text-emerald-700";
  if (s === "Cancelled" || s === "Returned" || s === "Rejected" || s === "Suspended") return "bg-red-50 text-red-600";
  return "bg-amber-50 text-amber-700";
}

const MSG: Record<string, string> = {
  NOT_LOGGED_IN: "আগে লগইন করুন",
  NOT_APPROVED: "আপনার ড্রপশিপার অ্যাকাউন্ট এখনো অনুমোদিত নয়",
  BAD_NAME: "সঠিক নাম লিখুন",
  BAD_NUMBER: "সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন",
  BAD_ADDRESS: "পুরো ঠিকানা লিখুন (কমপক্ষে ৮ অক্ষর)",
  BAD_QTY: "পরিমাণ ১ থেকে ৫০ এর মধ্যে দিন",
  NO_ITEMS: "কমপক্ষে একটি পণ্য বেছে নিন",
  ALREADY_APPLIED: "আপনি আগেই আবেদন করেছেন",
  SELL_BELOW_COST: "বিক্রয়মূল্য পাইকারি দামের চেয়ে কম হতে পারবে না",
  NOT_FOUND: "পণ্য পাওয়া যায়নি বা বন্ধ আছে",
  DS_DISABLED: "ড্রপশিপিং এখন বন্ধ আছে",
  TOO_MANY: "এই নম্বর থেকে অনেক অর্ডার এসেছে, কিছুক্ষণ পরে চেষ্টা করুন",
  BELOW_MIN: "সর্বনিম্ন উত্তোলনের চেয়ে কম",
  INSUFFICIENT_BALANCE: "ব্যালেন্স যথেষ্ট নয়",
  METHOD_NOT_ALLOWED: "এই মাধ্যম চলবে না",
  FORBIDDEN: "অনুমতি নেই",
  BAD_TRANSITION: "এই স্ট্যাটাসে এখন যাওয়া যাবে না",
  ALREADY_PROCESSED: "এটা আগেই প্রসেস হয়ে গেছে",
  REF_REQUIRED: "পাঠানোর রেফারেন্স লিখুন",
  BAD_STATUS: "স্ট্যাটাস ঠিক নয়"
};

export function dsErr(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  for (const k of Object.keys(MSG)) if (m.includes(k)) return MSG[k];
  return m.length > 140 ? "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন" : m;
}

export async function dsRpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}

export const tk = (n: number | string) => `৳${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function fmtDT(s: string): string {
  return new Date(s).toLocaleString("bn-BD", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function productTitle(p: DsProduct): string {
  return p.products?.name_bn || p.products?.name_en || "পণ্য";
}
export function productImage(p: DsProduct): string | null {
  const imgs = p.products?.product_images ?? [];
  if (!imgs.length) return null;
  const sorted = [...imgs].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order);
  return sorted[0].url;
}

export function shareLink(code: string, productId: string): string {
  return `${window.location.origin}/ds/${code}/${productId}`;
}

export async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export const PRODUCT_SELECT = "product_id,wholesale,is_active,products(name_bn,name_en,current_price,product_images(url,is_main,sort_order))";
