import { Cur, money, telErr } from "./telecomService";

export type SaStatus = "Pending" | "Processing" | "Confirmed" | "Completed" | "Rejected" | "Failed" | "Refunded";

export interface SaOperator {
  id: number;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
}
export interface SaProduct {
  id: number;
  operator_id: number;
  name: string;
  denomination: string;
  price_sar: number;
  price_bdt: number;
  ptype: "voucher" | "direct";
  image_url: string | null;
  description: string;
  instructions: string;
  validity: string;
  is_active: boolean;
  in_stock: boolean;
  sort_order: number;
}
export interface SaOrder {
  id: number;
  reseller_id: string;
  product_id: number | null;
  operator_name: string;
  product_name: string;
  denomination: string;
  ptype: "voucher" | "direct";
  currency: Cur;
  amount: number;
  dest_number: string;
  status: SaStatus;
  secret: string;
  fulfil_note: string;
  reject_reason: string;
  refunded: boolean;
  created_at: string;
  updated_at: string;
}
export interface BankAccount {
  id: number;
  bank_name: string;
  account_name: string;
  iban: string;
  qr_url: string | null;
  instructions: string;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

export const SA_STATUS_BN: Record<SaStatus, string> = {
  Pending: "অপেক্ষমাণ (Pending)",
  Processing: "প্রসেসিং",
  Confirmed: "নিশ্চিত (Confirmed)",
  Completed: "সম্পন্ন (Completed)",
  Rejected: "বাতিল (Rejected)",
  Failed: "ব্যর্থ (Failed)",
  Refunded: "ফেরত (Refunded)"
};

export const SA_STATUSES: SaStatus[] = ["Pending", "Processing", "Confirmed", "Completed", "Rejected", "Failed", "Refunded"];

export function saPillClass(s: string): string {
  if (s === "Completed" || s === "Confirmed") return "text-teal-dark bg-teal-tint";
  if (s === "Pending" || s === "Processing") return "text-orange bg-orange-tint";
  return "text-red-600 bg-red-50";
}

const SA_MSG: Record<string, string> = {
  SECRET_REQUIRED: "কোড লিখুন (অথবা স্টকে কোড যোগ করুন)",
  DUPLICATE_CODE: "এই কোড আগেই অন্য অর্ডারে দেওয়া হয়েছে",
  REASON_REQUIRED: "কারণ লিখুন"
};

export function saErr(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  for (const k of Object.keys(SA_MSG)) if (m.includes(k)) return SA_MSG[k];
  return telErr(e);
}

/** পণ্যের দাম দেখানোর লেখা */
export function saPrice(p: SaProduct, cur: Cur): number {
  return cur === "SAR" ? p.price_sar : p.price_bdt;
}

/** WhatsApp নম্বর থেকে শুধু অঙ্ক (wa.me এর জন্য) */
export function waDigits(s: string): string {
  return String(s ?? "").replace(/\D/g, "");
}

/** কোড/পাসওয়ার্ড ছাড়া অর্ডারের লেখা; কাস্টমার নিজে WhatsApp এ পাঠাবে */
export function waOrderText(o: SaOrder): string {
  const lines = [
    "J H Telecom Reseller",
    `Order: S${o.id}`,
    `Operator: ${o.operator_name}`,
    `Product: ${o.product_name}${o.denomination ? " (" + o.denomination + ")" : ""}`,
    `Price: ${money(o.currency, o.amount)}`,
    `Status: ${o.status}`
  ];
  if (o.ptype === "direct" && o.dest_number) lines.push(`Number: ${o.dest_number}`);
  return lines.join("\n");
}

export function waLink(number: string, text: string): string {
  return `https://wa.me/${waDigits(number)}?text=${encodeURIComponent(text)}`;
}
