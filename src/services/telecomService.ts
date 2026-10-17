import { supabase } from "../lib/supabase";

export type Cur = "BDT" | "SAR";

export interface TelReseller {
  id: string;
  user_id: string;
  name: string;
  country: string;
  mobile: string;
  status: "Pending" | "Approved" | "Rejected" | "Suspended";
  perm: { bKash?: boolean; Nagad?: boolean; Rocket?: boolean; Bangladesh?: boolean };
  created_at: string;
}
export interface TelDeposit {
  id: number;
  reseller_id: string;
  method: string;
  currency: Cur;
  amount: number;
  trx_id: string;
  status: "Pending" | "Approved" | "Rejected";
  created_at: string;
}
export interface TelProduct {
  id: number;
  name: string;
  icon: string;
  price_bdt: number;
  price_sar: number;
  is_active: boolean;
  sort_order: number;
}
export interface TelPack {
  id: number;
  name: string;
  price_bdt: number;
  price_sar: number;
  is_active: boolean;
  sort_order: number;
}
export interface TelOrder {
  id: number;
  reseller_id: string;
  product_name: string;
  currency: Cur;
  amount: number;
  secret: string;
  created_at: string;
}
export interface TelRecharge {
  id: number;
  reseller_id: string;
  operator: string;
  number: string;
  pack_name: string;
  currency: Cur;
  amount: number;
  status: "Pending" | "Processing" | "Completed" | "Failed" | "Cancelled";
  fulfil_ref: string;
  refunded: boolean;
  created_at: string;
}
export interface TelLedger {
  id: number;
  reseller_id: string;
  currency: Cur;
  type: string;
  amount: number;
  balance_after: number;
  ref: string;
  note: string;
  created_at: string;
}
export interface TelSettings {
  commission_pct: number;
  flat_charge: number;
  recharge_enabled: boolean;
  deposit_note: string;
}

/** টাকার অঙ্ক ডাটাবেসে পয়সা/হালালা (×১০০) হিসেবে থাকে */
export function money(c: Cur, a: number): string {
  return (c === "BDT" ? "৳" : "SAR ") + (Number(a) / 100).toFixed(2);
}
export function toMinor(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
export function fmtDate(s: string): string {
  return new Date(s).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" });
}

const MSG: Record<string, string> = {
  NOT_LOGGED_IN: "আগে লগইন করুন",
  NOT_APPROVED: "রিসেলার অ্যাকাউন্ট অনুমোদিত নয়",
  ALREADY_APPLIED: "আপনি আগেই আবেদন করেছেন",
  NAME_REQUIRED: "নাম লিখুন",
  METHOD_NOT_ALLOWED: "এই পেমেন্ট মাধ্যমের অনুমতি নেই",
  BAD_AMOUNT: "সঠিক পরিমাণ দিন",
  BAD_TRX: "ট্রানজেকশন ID কমপক্ষে ৬ অক্ষরের দিন",
  BAD_CURRENCY: "কারেন্সি সঠিক নয়",
  DUPLICATE_TRX: "এই ট্রানজেকশন ID আগেই ব্যবহার হয়েছে",
  INSUFFICIENT_BALANCE: "এই কারেন্সির ওয়ালেটে ব্যালেন্স কম (অন্য কারেন্সি ব্যবহার হবে না)",
  NOT_FOUND: "পাওয়া যায়নি",
  NOT_AVAILABLE_IN_CURRENCY: "এই কারেন্সিতে দাম সেট করা নেই",
  OUT_OF_STOCK: "স্টক নেই",
  RECHARGE_DISABLED: "বাংলাদেশ রিচার্জ এখন বন্ধ আছে",
  BAD_OPERATOR: "অপারেটর সঠিক নয়",
  BAD_NUMBER: "সঠিক ১১ সংখ্যার নম্বর দিন",
  ALREADY_PROCESSED: "এটা আগেই প্রক্রিয়া হয়ে গেছে",
  ALREADY_FINAL: "এই অর্ডার আগেই শেষ হয়ে গেছে",
  REF_REQUIRED: "সম্পন্ন করতে ফুলফিলমেন্ট রেফারেন্স লিখুন",
  FORBIDDEN: "অনুমতি নেই",
  BAD_STATUS: "স্ট্যাটাস সঠিক নয়"
};

export function telErr(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  for (const k of Object.keys(MSG)) if (m.includes(k)) return MSG[k];
  return m;
}

/** সার্ভার ফাংশন কল; ভুল হলে throw করে */
export async function telRpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}

export const OPERATORS = ["Grameenphone", "Robi", "Banglalink", "Airtel", "Teletalk"];
export const METHODS = ["bKash", "Nagad", "Rocket"] as const;
