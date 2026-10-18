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
  category?: string | null;
  description?: string | null;
  image_url?: string | null;
  validity_days?: number | null;
  note?: string | null;
}
export interface TelPack {
  id: number;
  name: string;
  price_bdt: number;
  price_sar: number;
  is_active: boolean;
  sort_order: number;
  operator?: string | null;
  category?: string | null;
  validity_days?: number | null;
  tag?: string | null;
}
export interface TelOrder {
  id: number;
  reseller_id: string;
  product_id?: number | null;
  product_name: string;
  currency: Cur;
  amount: number;
  secret: string;
  created_at: string;
  expires_at?: string | null;
  note?: string | null;
  image_url?: string | null;
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
  purchase_note?: string;
}
export interface TelPayMethod {
  id: number;
  method: string;
  number: string;
  kind: string;
  instructions: string;
  is_active: boolean;
  sort_order: number;
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
export function fmtDay(s: string): string {
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  return d.toLocaleDateString("en-GB");
}
export function isExpired(s?: string | null): boolean {
  if (!s) return false;
  const d = new Date(s.length <= 10 ? s + "T23:59:59" : s);
  return d.getTime() < Date.now();
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
  PACK_NOT_FOR_OPERATOR: "এই প্যাকেজ এই অপারেটরের জন্য নয়",
  ALREADY_PROCESSED: "এটা আগেই প্রক্রিয়া হয়ে গেছে",
  ALREADY_FINAL: "এই অর্ডার আগেই শেষ হয়ে গেছে",
  REF_REQUIRED: "সম্পন্ন করতে ফুলফিলমেন্ট রেফারেন্স লিখুন",
  FORBIDDEN: "অনুমতি নেই",
  BAD_STATUS: "স্ট্যাটাস সঠিক নয়",
  BAD_PIN_FORMAT: "পিন ৪ থেকে ৬ সংখ্যার হতে হবে",
  PIN_NOT_SET: "আগে পিন সেট করুন",
  PIN_REQUIRED: "পিন দিতে হবে",
  PIN_LOCKED: "অনেকবার ভুল পিন দেওয়া হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন",
  PIN_WRONG: "পিন ভুল"
};

/** পিন ভুল হলে সার্ভার throw করে না, {ok:false,error} ফেরত দেয়; সেটাকে Error বানায় */
export class PinError extends Error {
  code: string;
  left?: number;
  constructor(code: string, left?: number) {
    super(code === "PIN_WRONG" && left != null ? `পিন ভুল (আর ${left} বার চেষ্টা করা যাবে)` : MSG[code] ?? code);
    this.code = code;
    this.left = left;
  }
}

export function telErr(e: unknown): string {
  if (e instanceof PinError) return e.message;
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

/** পিনওয়ালা ফাংশন (jsonb ফেরত দেয়) */
export async function telRpcPin(name: string, args: Record<string, unknown>): Promise<{ id?: number }> {
  const data = await telRpc<{ ok: boolean; error?: string; left?: number; id?: number }>(name, args);
  if (!data || data.ok === false) throw new PinError(data?.error ?? "PIN_WRONG", data?.left);
  return data;
}

export const OPERATORS = ["Grameenphone", "Robi", "Banglalink", "Airtel", "Teletalk"];
export const METHODS = ["bKash", "Nagad", "Rocket"] as const;

/** ব্র্যান্ডের রং (ডিপজিটের সময় কোন অ্যাপ বোঝাতে) */
export const METHOD_COLOR: Record<string, string> = {
  bKash: "#E2136E",
  Nagad: "#F37021",
  Rocket: "#8C3494"
};

export const PACK_CATEGORIES: { k: string; label: string; icon: string }[] = [
  { k: "Internet", label: "ইন্টারনেট", icon: "📶" },
  { k: "Bundle", label: "বান্ডেল", icon: "📦" },
  { k: "Minutes", label: "মিনিট", icon: "📞" },
  { k: "Recharge", label: "রিচার্জ", icon: "⚡" },
  { k: "Other", label: "অন্যান্য", icon: "✨" }
];

/** নম্বরের প্রথম অংশ দেখে অপারেটর অনুমান (MNP হলে ভুল হতে পারে, তাই বদলানো যায়) */
export function detectOperator(num: string): string | null {
  const p = num.slice(0, 3);
  if (p === "017" || p === "013") return "Grameenphone";
  if (p === "018") return "Robi";
  if (p === "019" || p === "014") return "Banglalink";
  if (p === "016") return "Airtel";
  if (p === "015") return "Teletalk";
  return null;
}

export interface SecretRow {
  label: string;
  value: string;
}

const LV = /^([^:\/：]{1,40}?)\s*[:：](?!\/\/)\s*(.+)$/;

/** "Operator Code: 52390 / Username: x" বা লাইন ধরে ধরে কপি-করার-মতো সারিতে ভাঙে */
export function parseSecret(secret: string): SecretRow[] {
  const rows: SecretRow[] = [];
  for (const rawLine of String(secret ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/\s+\/\s+/);
    const useParts = parts.length > 1 && parts.every((p) => LV.test(p.trim()));
    for (const part of useParts ? parts : [line]) {
      const m = part.trim().match(LV);
      if (m) rows.push({ label: m[1].trim(), value: m[2].trim() });
      else rows.push({ label: "", value: part.trim() });
    }
  }
  return rows;
}

export function secretToText(rows: SecretRow[]): string {
  return rows.map((r) => (r.label ? `${r.label}: ${r.value}` : r.value)).join("\n");
}

export async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
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
