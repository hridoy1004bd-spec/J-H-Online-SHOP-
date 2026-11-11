import { supabase } from "../lib/supabase";
import { dsRpc } from "./dropshipService";

export type SubKind = "dropship" | "telecom";
export type SubStatus = "active" | "suspended" | "expired" | "cancelled";

export interface SubSetting {
  kind: SubKind;
  enabled: boolean;
}
export interface SubPlan {
  id: string;
  kind: SubKind;
  name: "Basic" | "Premium" | "VIP";
  price: number;
  features: string[];
  active: boolean;
}
export interface Subscription {
  id: string;
  kind: SubKind;
  user_id: string;
  plan_id: string;
  status: SubStatus;
  is_free: boolean;
  started_at: string;
  expires_at: string;
  note: string | null;
}
export interface SubPayment {
  id: string;
  subscription_id: string | null;
  kind: SubKind;
  user_id: string;
  amount: number;
  method: string | null;
  reference: string | null;
  note: string | null;
  created_at: string;
}
export interface CommissionRate {
  service_key: string;
  label: string;
  pct: number;
  sort: number;
}
export interface CommissionOverride {
  reseller_id: string;
  service_key: string;
  pct: number;
}
export interface DsTier {
  tier: "Basic" | "Premium" | "VIP";
  discount_pct: number;
}
export interface PersonRef {
  id: string; // row id (partner / reseller)
  user_id: string | null;
  name: string;
  mobile: string | null;
}

const MSG: Record<string, string> = {
  NOT_ADMIN: "শুধু অ্যাডমিন এটা করতে পারবে",
  NOT_LOGGED_IN: "আগে লগইন করুন",
  BAD_DAYS: "দিনের সংখ্যা ১ থেকে ৩৬৫০ এর মধ্যে দিন",
  BAD_PLAN: "প্ল্যান পাওয়া যায়নি",
  BAD_PCT: "হার ০ থেকে ১০০ এর মধ্যে দিন (স্তরের ছাড় সর্বোচ্চ ৫০)",
  BAD_PRICE: "দাম ঠিক নয়",
  BAD_AMOUNT: "টাকার পরিমাণ ঠিক নয়",
  BAD_STATUS: "স্ট্যাটাস ঠিক নয়",
  BAD_KIND: "ধরন ঠিক নয়",
  BAD_TIER: "স্তর পাওয়া যায়নি",
  NOT_FOUND: "পাওয়া যায়নি",
  sub_payments_ref_uniq: "এই রেফারেন্স দিয়ে আগেই পেমেন্ট নথিভুক্ত হয়েছে"
};

export function platErr(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  for (const k of Object.keys(MSG)) if (m.includes(k)) return MSG[k];
  return m.length > 140 ? "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন" : m;
}

export const rpc = dsRpc;

export async function loadPeople(kind: SubKind): Promise<PersonRef[]> {
  const table = kind === "dropship" ? "ds_partners" : "telecom_resellers";
  const { data, error } = await supabase
    .from(table)
    .select("id,user_id,name,mobile,status")
    .eq("status", "Approved")
    .order("name");
  if (error) throw error;
  return ((data ?? []) as (PersonRef & { status: string })[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    mobile: r.mobile
  }));
}

export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });

export const daysLeft = (s: string) => Math.ceil((new Date(s).getTime() - Date.now()) / 86400000);
