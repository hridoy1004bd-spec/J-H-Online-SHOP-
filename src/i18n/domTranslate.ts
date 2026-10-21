import { BN_EN } from "./bnEn";

/**
 * রানটাইম অনুবাদক: ভাষা English হলে পাতার বাংলা লেখা (টেক্সট, placeholder, title, alt, alert/confirm)
 * অভিধান (bnEn.ts) থেকে ইংরেজি করে দেয়। বাংলায় ফিরলে আসল লেখা ফেরত আসে।
 * translate="no" বা data-no-tr দেওয়া অংশ বাদ যায় (যেমন ডাটাবেসের পণ্যের নাম)।
 */
const HAS_BN = /[ঀ-৿]/;
const BN_DIGITS: Record<string, string> = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };
const ATTRS = ["placeholder", "title", "alt", "aria-label"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "CODE"]);

const KEYS = Object.keys(BN_EN)
  .filter((k) => k.length >= 8)
  .sort((a, b) => b.length - a.length);

const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^অর্ডার (\S+) এখন (.+)।$/, (m) => `Order ${m[1]} is now ${m[2]}.`],
  [/^আপনার ৳?([\d,.]+) বকেয়া আছে/, (m) => `You owe ৳${m[1]}.`],
  [/^"(.+)" মুছে ফেলবেন\?$/, (m) => `Delete "${m[1]}"?`],
  [/^সব \((\d+)\)$/, (m) => `All (${m[1]})`],
  [/^পিন ভুল \(আর (\d+) বার চেষ্টা করা যাবে\)$/, (m) => `Wrong PIN (${m[1]} attempts left)`],
  [/^(\d+) মিনিট$/, (m) => `${m[1]} minutes`],
  [/^মূল্য: (.+)$/, (m) => `Price: ${m[1]}`],
  [/^তারিখ: (.+)$/, (m) => `Date: ${m[1]}`],
  [/^অর্ডার: (.+)$/, (m) => `Order: ${m[1]}`],
  [/^স্ট্যাটাস: (.+)$/, (m) => `Status: ${m[1]}`],
  [/^মেয়াদ শেষ: (.+)$/, (m) => `Expires: ${m[1]}`],
  [/^(.+) · অর্ডার (.+)$/, (m) => `${translateText(m[1])} · Order ${m[2]}`],
  [/^(.+) · টাকা ফেরত হয়েছে \(একবারই\)$/, (m) => `${m[1]} · Money refunded (once)`],
  [/^সম্পন্ন ✓ \(বকেয়া বাবদ ৳(.+) কাটা হয়েছে\)$/, (m) => `Completed ✓ (৳${m[1]} deducted for dues)`],
];

function isBnLetter(ch: string | undefined) {
  return !!ch && /[ঀ-৿]/.test(ch);
}

export function translateText(input: string): string {
  if (!input || !HAS_BN.test(input)) return input;
  const lead = input.match(/^\s*/)![0];
  const trail = input.match(/\s*$/)![0];
  const core = input.trim();
  if (!core) return input;
  let out: string | undefined = BN_EN[core];
  if (out === undefined) {
    for (const [re, fn] of PATTERNS) {
      const m = core.match(re);
      if (m) {
        out = fn(m);
        break;
      }
    }
  }
  if (out === undefined) {
    let s = core;
    for (const k of KEYS) {
      let i = s.indexOf(k);
      while (i !== -1) {
        const before = s[i - 1];
        const after = s[i + k.length];
        if (!isBnLetter(before) && !isBnLetter(after)) {
          s = s.slice(0, i) + BN_EN[k] + s.slice(i + k.length);
          i = s.indexOf(k, i + BN_EN[k].length);
        } else i = s.indexOf(k, i + 1);
      }
    }
    out = s;
  }
  out = out.replace(/[০-৯]/g, (d) => BN_DIGITS[d]);
  return lead + out + trail;
}

let observer: MutationObserver | null = null;
let active = false;
const textState = new WeakMap<Text, { orig: string; out: string }>();
const tracked = new Set<Text>();
const attrState = new WeakMap<Element, Record<string, { orig: string; out: string }>>();
const trackedEls = new Set<Element>();
let origAlert: typeof window.alert | null = null;
let origConfirm: typeof window.confirm | null = null;

function skipped(el: Element | null): boolean {
  if (!el) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  return !!el.closest('[translate="no"],[data-no-tr]');
}

function doText(n: Text) {
  const parent = n.parentElement;
  if (!parent || skipped(parent)) return;
  const st = textState.get(n);
  const cur = n.data;
  if (st && cur === st.out) return; // আমাদেরই বসানো
  if (!HAS_BN.test(cur)) {
    if (st) textState.delete(n);
    return;
  }
  const out = translateText(cur);
  textState.set(n, { orig: cur, out });
  tracked.add(n);
  if (out !== cur) n.data = out;
}

function doEl(el: Element) {
  if (skipped(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const map = attrState.get(el) ?? {};
    const st = map[a];
    if (st && v === st.out) continue;
    if (!HAS_BN.test(v)) continue;
    const out = translateText(v);
    map[a] = { orig: v, out };
    attrState.set(el, map);
    trackedEls.add(el);
    if (out !== v) el.setAttribute(a, out);
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  doEl(el);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
    else doEl(n as Element);
    n = tw.nextNode();
  }
}

export function startDomTranslate() {
  if (active || typeof document === "undefined") return;
  active = true;
  walk(document.body);
  observer = new MutationObserver((muts) => {
    observer?.disconnect();
    try {
      for (const m of muts) {
        if (m.type === "childList") m.addedNodes.forEach((n) => walk(n));
        else if (m.type === "characterData") doText(m.target as Text);
        else if (m.type === "attributes") doEl(m.target as Element);
      }
    } finally {
      observer?.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  if (!origAlert) {
    origAlert = window.alert.bind(window);
    origConfirm = window.confirm.bind(window);
    window.alert = (m?: any) => origAlert!(translateText(String(m ?? "")));
    window.confirm = (m?: string) => origConfirm!(translateText(String(m ?? "")));
  }
}

export function stopDomTranslate() {
  if (!active) return;
  active = false;
  observer?.disconnect();
  observer = null;
  tracked.forEach((n) => {
    const st = textState.get(n);
    if (st && n.isConnected && n.data === st.out) n.data = st.orig;
    textState.delete(n);
  });
  tracked.clear();
  trackedEls.forEach((el) => {
    const map = attrState.get(el);
    if (map && el.isConnected) for (const a of Object.keys(map)) if (el.getAttribute(a) === map[a].out) el.setAttribute(a, map[a].orig);
    attrState.delete(el);
  });
  trackedEls.clear();
}

/** alert/confirm আগের অবস্থায় ফেরত (টেস্ট/ক্লিনআপ) */
export function restoreDialogs() {
  if (origAlert) window.alert = origAlert;
  if (origConfirm) window.confirm = origConfirm;
  origAlert = null;
  origConfirm = null;
}
