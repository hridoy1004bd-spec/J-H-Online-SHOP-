import { supabase } from "../lib/supabase";
import { compressForUpload } from "./uploadService";

/** রিসেলার ও ড্রপশিপার আবেদনের একই তথ্য (KYC) */
export interface KycPayload {
  name: string;
  country?: string;
  mobile: string;
  whatsapp: string;
  email: string;
  id_doc_type: "NID" | "Passport" | "Iqama" | "Driving";
  id_number: string;
  address: string;
  fb_link: string;
  payout_method: "bKash" | "Nagad" | "Rocket";
  payout_number: string;
  id_doc_path: string;
  id_back_path: string;
  selfie_path: string;
}

export interface KycInfo {
  email?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  address_bd?: string | null;
  id_doc_type?: string | null;
  id_number?: string | null;
  id_doc_path?: string | null;
  id_back_path?: string | null;
  selfie_path?: string | null;
  fb_link?: string | null;
  payout_method?: string | null;
  payout_number?: string | null;
}

const BUCKET = "telecom-docs"; // ব্যক্তিগত বাকেট: শুধু নিজে ও অ্যাডমিন দেখতে পায়

export async function uploadKyc(file: File, tag: "id-front" | "id-back" | "selfie"): Promise<string> {
  if (!/^image\//.test(file.type)) throw new Error("শুধু ছবি দিন (JPG/PNG)");
  if (file.size > 12 * 1024 * 1024) throw new Error("ছবি ১২ MB এর কম হতে হবে");
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("আগে লগইন করুন");
  const c = await compressForUpload(file, 1600, 0.8);
  const path = `${uid}/kyc-${tag}-${Date.now()}.${c.ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, c.blob, { contentType: c.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function signedKycUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

const MSG: Record<string, string> = {
  BAD_NAME: "সঠিক নাম লিখুন",
  BAD_NUMBER: "সঠিক মোবাইল নম্বর দিন",
  BAD_WHATSAPP: "সঠিক WhatsApp নম্বর দিন",
  BAD_EMAIL: "সঠিক ইমেইল দিন",
  BAD_ID_TYPE: "পরিচয়পত্রের ধরন বেছে নিন",
  BAD_ID_NUMBER: "পরিচয়পত্রের নম্বর দিন",
  BAD_ADDRESS: "পুরো ঠিকানা লিখুন (কমপক্ষে ৮ অক্ষর)",
  BAD_FB: "ফেসবুক লিংক দিন",
  BAD_PAYOUT: "টাকা পাওয়ার মাধ্যম বেছে নিন",
  BAD_PAYOUT_NUMBER: "সঠিক bKash/Nagad নম্বর দিন (01XXXXXXXXX)",
  ID_PHOTO_REQUIRED: "পরিচয়পত্রের ছবি দিন",
  SELFIE_REQUIRED: "নিজের সেলফি দিন",
  ALREADY_APPLIED: "আপনি আগেই আবেদন করেছেন",
  NOT_LOGGED_IN: "আগে লগইন করুন"
};
export function kycErr(e: unknown): string | null {
  const m = String((e as { message?: string })?.message ?? e);
  for (const k of Object.keys(MSG)) if (m.includes(k)) return MSG[k];
  return null;
}
