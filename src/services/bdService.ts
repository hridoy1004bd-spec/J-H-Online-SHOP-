import { supabase } from "../lib/supabase";
import { telErr } from "./telecomService";

const BD_MSG: Record<string, string> = {
  BDT_ONLY: "রিচার্জ শুধু BDT ওয়ালেট থেকে হবে",
  BAD_TYPE: "ধরন বেছে নিন",
  BAD_AMOUNT: "সঠিক পরিমাণ দিন",
  BAD_NUMBER: "সঠিক ১১ সংখ্যার নম্বর দিন",
  REF_REQUIRED: "সম্পন্ন করতে রেফারেন্স লিখুন",
  ALREADY_PROCESSED: "এটা আগেই প্রসেস হয়ে গেছে",
  BAD_STATUS: "স্ট্যাটাস ঠিক নয়",
  BAD_TRX: "ব্যাংকের মেসেজ পেস্ট করুন অথবা স্ক্রিনশট দিন",
  DUPLICATE_TRX: "এই মেসেজ/ট্রানজেকশন আগেই জমা দেওয়া হয়েছে"
};

export function bdErr(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  for (const k of Object.keys(BD_MSG)) if (m.includes(k)) return BD_MSG[k];
  return telErr(e);
}

const OP_COLORS: Record<string, string> = {
  Grameenphone: "#00a1e0",
  Robi: "#e60012",
  Banglalink: "#f58220",
  Airtel: "#d71920",
  Teletalk: "#2e8b3d"
};
export function opColor(op: string): string {
  return OP_COLORS[op] ?? "#2F7D6D";
}

/** ব্যাংক ডিপজিটের স্ক্রিনশট প্রাইভেট বাকেটে (শুধু নিজে ও অ্যাডমিন দেখে) */
export async function uploadProof(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("শুধু ছবি দিন");
  if (file.size > 6 * 1024 * 1024) throw new Error("ছবি ৬ MB এর কম হতে হবে");
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error("NOT_LOGGED_IN");
  const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const path = `${session.user.id}/dep-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("telecom-docs").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function signedProofUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("telecom-docs").createSignedUrl(path, 300);
  if (error || !data) return null;
  return data.signedUrl;
}

/** একই ব্যাংক মেসেজ দুইবার জমা ঠেকাতে মেসেজ থেকে একটা স্থির কোড */
export async function smsKey(text: string): Promise<string> {
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim();
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "SMS" + hex.slice(0, 14).toUpperCase();
}

/** "Amount:SR 1000" থেকে পরিমাণ বের করা (শুধু অনুমান, কাস্টমার বদলাতে পারবে) */
export function parseBankSms(text: string): { amount: string; cur: "SAR" | "BDT" } | null {
  const m = text.match(/Amount\s*:?\s*(SR|SAR|BDT|TK)\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  const cur = /^(BDT|TK)$/i.test(m[1]) ? "BDT" : "SAR";
  return { amount: m[2].replace(/,/g, ""), cur };
}
