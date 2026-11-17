import { supabase } from "../lib/supabase";

export interface PinResult {
  ok: boolean;
  error?: string;
  left?: number;
}

export async function verifyPin(pin: string): Promise<PinResult> {
  const { data, error } = await supabase.rpc("telecom_verify_pin", { p_pin: pin });
  if (error) throw error;
  return data as PinResult;
}

/** অ্যাডমিনের WhatsApp নম্বর (শুধু অঙ্ক) */
export async function adminWhatsapp(): Promise<string> {
  try {
    const { data } = await supabase.from("telecom_settings").select("whatsapp_number").eq("id", 1).maybeSingle();
    const a = String((data as { whatsapp_number?: string } | null)?.whatsapp_number ?? "").replace(/\D/g, "");
    if (a) return a;
    const { data: s } = await supabase.from("store_settings").select("whatsapp").eq("id", 1).maybeSingle();
    return String((s as { whatsapp?: string } | null)?.whatsapp ?? "").replace(/\D/g, "");
  } catch {
    return "";
  }
}

const KEY = (uid: string) => `jh_tel_unlock_${uid}`;
export function isUnlocked(uid: string): boolean {
  try {
    return sessionStorage.getItem(KEY(uid)) === "1";
  } catch {
    return false;
  }
}
export function setUnlocked(uid: string, on: boolean) {
  try {
    if (on) sessionStorage.setItem(KEY(uid), "1");
    else sessionStorage.removeItem(KEY(uid));
  } catch {
    /* ignore */
  }
}

export const HELP_TYPES = [
  { k: "pin", label: "পিন রিসেট করতে চাই" },
  { k: "password", label: "পাসওয়ার্ড পরিবর্তন করতে চাই" },
  { k: "both", label: "পিন ও পাসওয়ার্ড দুটোই" },
  { k: "other", label: "অন্য সমস্যা" }
] as const;
export type HelpType = (typeof HELP_TYPES)[number]["k"];

export function buildHelpMessage(f: { name: string; mobile: string; store: string; type: HelpType; note: string }): string {
  const t = HELP_TYPES.find((x) => x.k === f.type)?.label ?? "";
  const lines = [
    "আসসালামু আলাইকুম,",
    "জনাব J H Online Shop অ্যাডমিন সমীপে,",
    "",
    "আমি আপনাদের J H Telecom রিসেলার। নিচের তথ্য দিয়ে একটি আবেদন করছি।",
    "",
    `👤 নাম: ${f.name || "—"}`,
    `📱 মোবাইল নম্বর: ${f.mobile || "—"}`,
    `🏪 স্টোর / রিসেলারের নাম: ${f.store || "—"}`,
    `📝 আবেদন: ${t}`
  ];
  if (f.note.trim()) lines.push(`ℹ️ বিস্তারিত: ${f.note.trim()}`);
  lines.push("", "অনুগ্রহ করে তথ্য যাচাই করে ব্যবস্থা নিলে কৃতজ্ঞ থাকব।", "ধন্যবাদ।");
  return lines.join("\n");
}

export const SERVICE_ERR: Record<string, string> = {
  SERVICE_DISABLED: "এই সেবা আপনার জন্য বন্ধ আছে",
  BAD_PROVIDER: "প্রদানকারীর নাম দিন",
  BAD_ACCOUNT: "নম্বর/অ্যাকাউন্ট ঠিক নয়",
  BAD_AMOUNT: "টাকার পরিমাণ ঠিক নয়",
  INSUFFICIENT_BALANCE: "ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই",
  RATE_TOO_HIGH: "কমিশন আপনার নিজের কমিশনের বেশি দেওয়া যাবে না",
  ACCOUNT_EXISTS: "এই নম্বরে আগেই অ্যাকাউন্ট আছে",
  INVALID_MOBILE: "মোবাইল নম্বর ঠিক নয়",
  NAME_REQUIRED: "নাম দিন",
  WEAK_PASSWORD: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর",
  FORBIDDEN: "অনুমতি নেই",
  NOT_FOUND: "পাওয়া যায়নি",
  PIN_WRONG: "পিন ভুল",
  PIN_LOCKED: "অনেকবার ভুল পিন দেওয়া হয়েছে। ১৫ মিনিট পর চেষ্টা করুন",
  PIN_NOT_SET: "আগে পিন সেট করুন"
};
export function svcErr(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  for (const k of Object.keys(SERVICE_ERR)) if (m.includes(k)) return SERVICE_ERR[k];
  return m.length > 120 ? "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন" : m;
}

export interface TelRequest {
  id: number;
  kind: "manual_drive" | "e_drive" | "bill_payment";
  provider: string;
  account: string;
  amount: number;
  cost: number;
  note: string;
  status: string;
  fulfil_ref: string;
  refunded: boolean;
  reseller_id: string;
  created_at: string;
}
export interface TeamUser {
  u_id: string;
  u_name: string;
  u_mobile: string;
  u_status: string;
  u_perm: Record<string, boolean>;
  u_created: string;
  u_balance: number;
  u_rates: Record<string, number>;
}
export interface MyRate {
  service_key: string;
  label: string;
  pct: number;
}

export async function accountInvoke(body: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke("account-create", { body });
  if (error) {
    let code = "";
    let left: number | undefined;
    try {
      const j = await (error as unknown as { context?: Response }).context?.json();
      code = j?.error ?? "";
      left = j?.left;
    } catch {
      /* ignore */
    }
    throw new Error(code === "PIN_WRONG" && left != null ? `পিন ভুল (আর ${left} বার চেষ্টা করা যাবে)` : SERVICE_ERR[code] ?? "অ্যাকাউন্ট তৈরি হয়নি");
  }
  void data;
}

export const PERM_LIST: { k: string; label: string }[] = [
  { k: "Bangladesh", label: "Topup / Drive / M.Banking" },
  { k: "bKash", label: "bKash" },
  { k: "Nagad", label: "Nagad" },
  { k: "Rocket", label: "Rocket" },
  { k: "Cards", label: "Calling / VPN / Cards" },
  { k: "Requests", label: "Manual Drive / E Drive / Bill" }
];
