import { supabase } from "../lib/supabase";

/** অ্যাডমিন ফর্মে বাংলা ↔ ইংরেজি অটো অনুবাদ (Supabase Edge Function "translate", শুধু অ্যাডমিন) */
export type Script = "bn" | "en" | null;

export function detectScript(s: string): Script {
  if (!s.trim()) return null;
  if (/[ঀ-৿]/.test(s)) return "bn";
  if (/[A-Za-z]/.test(s)) return "en";
  return null;
}

const cache = new Map<string, string>();
const autoMade = new Set<string>();

export async function translateText(text: string, from: "bn" | "en", to: "bn" | "en"): Promise<string | null> {
  const t = text.trim();
  if (!t) return null;
  const key = `${from}>${to}|${t}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const { data, error } = await supabase.functions.invoke("translate", { body: { text: t, from, to } });
    if (error || !data?.text) return null;
    cache.set(key, data.text as string);
    return data.text as string;
  } catch {
    return null;
  }
}

export interface PairPatch {
  bn?: string;
  en?: string;
}

/**
 * একটি ঘর ছেড়ে এলে (blur) কল করুন। যে ভাষায় লেখা হয়েছে তা বুঝে অন্য ঘর অটো ভরে দেয়।
 * - বাংলা ঘরে ইংরেজি লিখলে → বাংলা ঘর বাংলা হয়ে যায়, ইংরেজি ঘরে আসল ইংরেজি বসে
 * - ইংরেজি ঘরে বাংলা লিখলে → ইংরেজি ঘর ইংরেজি হয়ে যায়
 * - অন্য ঘরে হাতে লেখা কিছু থাকলে সেটা মুছে না (শুধু ফাঁকা বা আগের অটো-অনুবাদ বদলায়)
 */
export async function autoPair(side: "bn" | "en", bn: string, en: string): Promise<PairPatch | null> {
  const text = side === "bn" ? bn : en;
  const script = detectScript(text);
  if (!script) return null;
  let bnVal: string | null;
  let enVal: string | null;
  if (script === "bn") {
    bnVal = text;
    enVal = await translateText(text, "bn", "en");
  } else {
    enVal = text;
    bnVal = await translateText(text, "en", "bn");
  }
  const patch: PairPatch = {};
  const free = (v: string) => !v.trim() || autoMade.has(v);
  if (side === "bn") {
    if (script === "en" && bnVal) patch.bn = bnVal;
    if (enVal && free(en)) patch.en = enVal;
  } else {
    if (script === "bn" && enVal) patch.en = enVal;
    if (bnVal && free(bn)) patch.bn = bnVal;
  }
  if (patch.bn) autoMade.add(patch.bn);
  if (patch.en) autoMade.add(patch.en);
  return patch.bn !== undefined || patch.en !== undefined ? patch : null;
}
