import type { Lang } from "../types";

export function money(amount: number) {
  return `৳${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function toBanglaDigits(input: string | number) {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}
