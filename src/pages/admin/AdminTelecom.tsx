import React, { useCallback, useEffect, useState } from "react";
import { Smartphone, Upload } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { uploadService } from "../../services/uploadService";
import AdminTelecomSaudi from "../../components/AdminTelecomSaudi";
import {
  Cur,
  OPERATORS,
  PACK_CATEGORIES,
  TelDeposit,
  TelLedger,
  TelOrder,
  TelPack,
  TelPayMethod,
  TelProduct,
  TelRecharge,
  TelReseller,
  TelSettings,
  fmtDate,
  fmtDay,
  isExpired,
  money,
  parseSecret,
  telErr,
  telRpc,
  toMinor
} from "../../services/telecomService";

type Tab = "o" | "r" | "d" | "q" | "sa" | "b" | "p" | "s" | "l";
const TABS: { k: Tab; label: string }[] = [
  { k: "o", label: "📊 ওভারভিউ" },
  { k: "r", label: "👤 রিসেলার" },
  { k: "d", label: "💰 ডিপজিট" },
  { k: "q", label: "📲 রিচার্জ" },
  { k: "sa", label: "🇸🇦 সৌদি" },
  { k: "b", label: "🛒 বিক্রি" },
  { k: "p", label: "🛍 পণ্য" },
  { k: "s", label: "⚙ সেটিংস" },
  { k: "l", label: "📒 লেজার" }
];

const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnRed = "press bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";

const TYPE_BN: Record<string, string> = {
  Deposit: "ডিপোজিট",
  Purchase: "পণ্য কেনা",
  "Recharge hold": "রিচার্জ (টাকা আটকানো)",
  Refund: "ফেরত",
  "Admin payment": "অ্যাডমিন পেমেন্ট"
};

function Pill({ s }: { s: string }) {
  const color =
    s === "Approved" || s === "Completed"
      ? "text-teal-dark bg-teal-tint"
      : s === "Pending" || s === "Processing"
      ? "text-orange bg-orange-tint"
      : "text-red-600 bg-red-50";
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>{s}</span>;
}

type Wallet = { reseller_id: string; currency: Cur; balance: number };
type StockRow = { product_id: number; status: string };

interface ProdForm {
  name: string;
  icon: string;
  bdt: string;
  sar: string;
  category: string;
  description: string;
  note: string;
  validity: string;
  image_url: string;
}
const EMPTY_PROD: ProdForm = { name: "", icon: "📦", bdt: "", sar: "", category: "", description: "", note: "", validity: "", image_url: "" };

interface PackForm {
  name: string;
  bdt: string;
  sar: string;
  operator: string;
  category: string;
  validity: string;
  tag: string;
}
const EMPTY_PACK: PackForm = { name: "", bdt: "", sar: "", operator: "", category: "Internet", validity: "", tag: "" };

function ProductFormFields({
  v,
  set,
  onUpload,
  uploading
}: {
  v: ProdForm;
  set: (p: ProdForm) => void;
  onUpload: (f: File | undefined) => void;
  uploading: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        {v.image_url ? (
          <img src={v.image_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-teal-tint flex items-center justify-center text-2xl">{v.icon || "📦"}</div>
        )}
        <label className="press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5">
          <Upload size={14} /> {uploading ? "আপলোড হচ্ছে…" : v.image_url ? "ছবি বদলান" : "ছবি আপলোড"}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
        </label>
        {v.image_url && (
          <button className="press text-[11px] text-red-500 font-semibold" onClick={() => set({ ...v, image_url: "" })}>
            সরান
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        <input className="input col-span-3" placeholder="নাম (যেমন Dollar Card $10)" value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} />
        <input className="input" placeholder="আইকন" value={v.icon} onChange={(e) => set({ ...v, icon: e.target.value })} />
        <input className="input col-span-2" type="number" placeholder="দাম ৳ (BDT)" value={v.bdt} onChange={(e) => set({ ...v, bdt: e.target.value })} />
        <input className="input col-span-2" type="number" placeholder="দাম SAR" value={v.sar} onChange={(e) => set({ ...v, sar: e.target.value })} />
        <input className="input col-span-2" placeholder="ক্যাটালগ (Calling Card / VPN ইত্যাদি)" value={v.category} onChange={(e) => set({ ...v, category: e.target.value })} />
        <input className="input col-span-2" type="number" placeholder="মেয়াদ (দিন, ঐচ্ছিক)" value={v.validity} onChange={(e) => set({ ...v, validity: e.target.value })} />
      </div>
      <textarea className="input mt-2" rows={2} placeholder="বিবরণ (পণ্যের নিচে দেখাবে)" value={v.description} onChange={(e) => set({ ...v, description: e.target.value })} />
      <textarea className="input mt-2" rows={2} placeholder="নোট (কেনার পর এই পণ্যের কার্ডে ও রসিদে দেখাবে)" value={v.note} onChange={(e) => set({ ...v, note: e.target.value })} />
    </>
  );
}

function PackFormFields({ v, set }: { v: PackForm; set: (p: PackForm) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input className="input col-span-2" placeholder="প্যাকেজের নাম (যেমন 10 GB + 100 Mins)" value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} />
      <input className="input" type="number" placeholder="দাম ৳" value={v.bdt} onChange={(e) => set({ ...v, bdt: e.target.value })} />
      <input className="input" type="number" placeholder="দাম SAR" value={v.sar} onChange={(e) => set({ ...v, sar: e.target.value })} />
      <select className="input" value={v.operator} onChange={(e) => set({ ...v, operator: e.target.value })}>
        <option value="">সব অপারেটর</option>
        {OPERATORS.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <select className="input" value={v.category} onChange={(e) => set({ ...v, category: e.target.value })}>
        {PACK_CATEGORIES.map((c) => (
          <option key={c.k} value={c.k}>
            {c.label}
          </option>
        ))}
      </select>
      <input className="input" type="number" placeholder="ভ্যালিডিটি (দিন)" value={v.validity} onChange={(e) => set({ ...v, validity: e.target.value })} />
      <input className="input" placeholder="ট্যাগ (যেমন Exclusive)" value={v.tag} onChange={(e) => set({ ...v, tag: e.target.value })} />
    </div>
  );
}

export default function AdminTelecom() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("o");
  const [busy, setBusy] = useState(false);
  const [resellers, setResellers] = useState<TelReseller[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [deps, setDeps] = useState<TelDeposit[]>([]);
  const [recharges, setRecharges] = useState<TelRecharge[]>([]);
  const [orders, setOrders] = useState<TelOrder[]>([]);
  const [ledger, setLedger] = useState<TelLedger[]>([]);
  const [products, setProducts] = useState<TelProduct[]>([]);
  const [packs, setPacks] = useState<TelPack[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [pays, setPays] = useState<TelPayMethod[]>([]);
  const [settings, setSettings] = useState<TelSettings>({ commission_pct: 3, flat_charge: 0, recharge_enabled: true, deposit_note: "", purchase_note: "" });

  const [selId, setSelId] = useState<string | null>(null);
  const [payCur, setPayCur] = useState<Cur>("BDT");
  const [payAmt, setPayAmt] = useState("");
  const [payNote, setPayNote] = useState("");
  const [refs, setRefs] = useState<Record<number, string>>({});
  const [stockText, setStockText] = useState<Record<number, string>>({});
  const [stockExp, setStockExp] = useState<Record<number, string>>({});
  const [stockPerLine, setStockPerLine] = useState<Record<number, boolean>>({});
  const [np, setNp] = useState<ProdForm>(EMPTY_PROD);
  const [editProdId, setEditProdId] = useState<number | null>(null);
  const [ep, setEp] = useState<ProdForm>(EMPTY_PROD);
  const [uploading, setUploading] = useState(false);
  const [nk, setNk] = useState<PackForm>(EMPTY_PACK);
  const [editPackId, setEditPackId] = useState<number | null>(null);
  const [epk, setEpk] = useState<PackForm>(EMPTY_PACK);
  const [pmEdit, setPmEdit] = useState<Record<number, Partial<TelPayMethod>>>({});

  const name = (id: string) => resellers.find((r) => r.id === id)?.name ?? id.slice(0, 6);

  const load = useCallback(async () => {
    const [r, w, d, rc, o, l, p, k, s, st, pm] = await Promise.all([
      supabase.from("telecom_resellers").select("*").order("created_at", { ascending: false }),
      supabase.from("telecom_wallets").select("reseller_id,currency,balance"),
      supabase.from("telecom_deposits").select("*").order("id", { ascending: false }).limit(200),
      supabase.from("telecom_recharges").select("*").order("id", { ascending: false }).limit(200),
      supabase.from("telecom_orders").select("*").order("id", { ascending: false }).limit(500),
      supabase.from("telecom_ledger").select("*").order("id", { ascending: false }).limit(300),
      supabase.from("telecom_products").select("*").order("sort_order").order("id"),
      supabase.from("telecom_recharge_packs").select("*").order("sort_order").order("id"),
      supabase.from("telecom_settings").select("commission_pct,flat_charge,recharge_enabled,deposit_note,purchase_note").eq("id", 1).maybeSingle(),
      supabase.from("telecom_stock").select("product_id,status").eq("status", "available"),
      supabase.from("telecom_pay_methods").select("*").order("sort_order")
    ]);
    setResellers((r.data ?? []) as TelReseller[]);
    setWallets((w.data ?? []) as Wallet[]);
    setDeps((d.data ?? []) as TelDeposit[]);
    setRecharges((rc.data ?? []) as TelRecharge[]);
    setOrders((o.data ?? []) as TelOrder[]);
    setLedger((l.data ?? []) as TelLedger[]);
    setProducts((p.data ?? []) as TelProduct[]);
    setPacks((k.data ?? []) as TelPack[]);
    if (s.data) setSettings({ purchase_note: "", ...(s.data as TelSettings) });
    setStock((st.data ?? []) as StockRow[]);
    setPays((pm.data ?? []) as TelPayMethod[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, okMsg: string): Promise<boolean> {
    setBusy(true);
    try {
      await fn();
      showToast(okMsg, "success");
      await load();
      return true;
    } catch (e) {
      showToast(telErr(e), "error");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function db(q: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await q;
    if (error) throw error;
  }

  async function uploadImg(file: File | undefined, apply: (url: string) => void) {
    if (!file) return;
    const err = uploadService.validate(file);
    if (err) return showToast(err, "error");
    setUploading(true);
    try {
      const { url } = await uploadService.uploadProductImage(file, "telecom");
      apply(url);
      showToast("ছবি যোগ হয়েছে", "success");
    } catch (e) {
      showToast(telErr(e), "error");
    } finally {
      setUploading(false);
    }
  }

  const prodPayload = (f: ProdForm) => ({
    name: f.name.trim(),
    icon: f.icon || "📦",
    price_bdt: toMinor(f.bdt),
    price_sar: toMinor(f.sar),
    category: f.category.trim() || null,
    description: f.description.trim(),
    note: f.note.trim(),
    validity_days: f.validity ? Math.max(0, Math.round(Number(f.validity))) || null : null,
    image_url: f.image_url || null
  });
  const packPayload = (f: PackForm) => ({
    name: f.name.trim(),
    price_bdt: toMinor(f.bdt),
    price_sar: toMinor(f.sar),
    operator: f.operator || null,
    category: f.category || "Other",
    validity_days: f.validity ? Math.max(0, Math.round(Number(f.validity))) || null : null,
    tag: f.tag.trim() || null
  });

  const sum = (c: Cur) => wallets.filter((w) => w.currency === c).reduce((s, w) => s + Number(w.balance), 0);
  const depSum = (c: Cur) => deps.filter((d) => d.status === "Approved" && d.currency === c).reduce((s, d) => s + Number(d.amount), 0);
  const saleSum = (c: Cur) => orders.filter((o) => o.currency === c).reduce((s, o) => s + Number(o.amount), 0);
  const balOf = (rid: string, c: Cur) => Number(wallets.find((w) => w.reseller_id === rid && w.currency === c)?.balance ?? 0);
  const stockOf = (pid: number) => stock.filter((s) => s.product_id === pid).length;
  const sel = resellers.find((r) => r.id === selId) ?? null;

  function ledgerDetail(l: TelLedger): string {
    const ref = l.ref || "";
    if (/^O\d+$/.test(ref)) {
      const o = orders.find((x) => `O${x.id}` === ref);
      return o ? `${o.product_name} · ${ref}` : `${l.note} · ${ref}`;
    }
    if (/^R\d+$/.test(ref)) {
      const r = recharges.find((x) => `R${x.id}` === ref);
      return r ? `${r.operator} ${r.number} · ${r.pack_name} · ${ref} (${r.status})` : `${l.note} · ${ref}`;
    }
    if (/^S\d+$/.test(ref)) return `সৌদি অর্ডার ${ref} · ${l.note}`;
    if (/^D\d+/.test(ref)) {
      const id = Number(ref.slice(1).split("/")[0]);
      const d = deps.find((x) => x.id === id);
      return d ? `${d.method} · TrxID ${d.trx_id} · ${ref.split("/")[0]}` : `${l.note} · ${ref}`;
    }
    return [l.note, ref].filter(Boolean).join(" · ");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-extrabold text-lg mb-3 flex items-center gap-2">
        <Smartphone size={20} className="text-teal" /> J H Telecom Reseller
      </h1>
      <div className="flex gap-1 overflow-x-auto bg-teal-tint p-1 rounded-xl mb-3">
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`press shrink-0 text-xs font-bold px-3 py-2 rounded-lg ${tab === t.k ? "bg-white text-teal-dark shadow" : "text-teal-dark/60"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sa" && <AdminTelecomSaudi resellers={resellers.map((r) => ({ id: r.id, name: r.name, mobile: r.mobile }))} />}

      {tab === "o" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">টেলিকম ওভারভিউ</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(["BDT", "SAR"] as Cur[]).map((c) => (
                <div key={c} className="bg-teal-tint rounded-xl p-3 text-xs">
                  <div className="font-bold text-mute mb-1">{c}</div>
                  <div>রিসেলারদের মোট ব্যালেন্স: <b>{money(c, sum(c))}</b></div>
                  <div>অনুমোদিত ডিপজিট: <b>{money(c, depSum(c))}</b></div>
                  <div>পণ্য বিক্রি: <b>{money(c, saleSum(c))}</b></div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-mute">BDT ও SAR কখনো যোগ করা হয় না। এই হিসাব শপের হিসাব থেকে সম্পূর্ণ আলাদা।</div>
          </div>
          <div className={card + " text-xs"}>
            রিসেলার: {resellers.length} · আবেদন পেন্ডিং: {resellers.filter((r) => r.status === "Pending").length} · পেন্ডিং ডিপজিট:{" "}
            {deps.filter((d) => d.status === "Pending").length} · পেন্ডিং রিচার্জ: {recharges.filter((x) => x.status === "Pending" || x.status === "Processing").length}
          </div>
        </>
      )}

      {tab === "r" && (
        <>
          {resellers.length === 0 && <div className="text-xs text-mute text-center py-6">এখনো কোনো রিসেলার আবেদন নেই</div>}
          {resellers.map((r) => (
            <div key={r.id} className={card}>
              <button className="w-full text-left" onClick={() => setSelId(selId === r.id ? null : r.id)}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm">
                    {r.name} <span className="text-mute font-normal text-xs">· {r.country} · {r.mobile}</span>
                  </span>
                  <Pill s={r.status} />
                </div>
                <div className="text-[11px] text-mute mt-1">
                  BDT {money("BDT", balOf(r.id, "BDT"))} · SAR {money("SAR", balOf(r.id, "SAR"))}
                </div>
              </button>
              {sel?.id === r.id && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button className={btn} disabled={busy} onClick={() => run(() => telRpc("telecom_admin_set_status", { p_reseller: r.id, p_status: "Approved" }), "অনুমোদিত")}>অনুমোদন</button>
                    <button className={btnRed} disabled={busy} onClick={() => run(() => telRpc("telecom_admin_set_status", { p_reseller: r.id, p_status: "Rejected" }), "বাতিল")}>বাতিল</button>
                    <button className={btnGhost} disabled={busy} onClick={() => run(() => telRpc("telecom_admin_set_status", { p_reseller: r.id, p_status: "Suspended" }), "সাসপেন্ড")}>সাসপেন্ড</button>
                    <button
                      className={btnGhost}
                      disabled={busy}
                      onClick={() => window.confirm(`${r.name} এর পিন রিসেট করবেন? সে নতুন পিন সেট করবে।`) && run(() => telRpc("telecom_admin_reset_pin", { p_reseller: r.id }), "পিন রিসেট হয়েছে")}
                    >
                      🔐 পিন রিসেট
                    </button>
                  </div>
                  <div className="text-xs font-bold text-mute mb-1">সার্ভিস পারমিশন</div>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {(["bKash", "Nagad", "Rocket", "Bangladesh"] as const).map((k) => (
                      <label key={k} className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={!!r.perm?.[k]}
                          disabled={busy}
                          onChange={(e) => run(() => telRpc("telecom_admin_set_perm", { p_reseller: r.id, p_perm: { ...r.perm, [k]: e.target.checked } }), "সংরক্ষিত")}
                        />
                        {k}
                      </label>
                    ))}
                  </div>
                  <div className="text-xs font-bold text-mute mb-1">💵 Add Payment (ওয়ালেটে জমা/কাটা; কাটতে মাইনাস লিখুন)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <select className="input" value={payCur} onChange={(e) => setPayCur(e.target.value as Cur)}>
                      <option>BDT</option>
                      <option>SAR</option>
                    </select>
                    <input className="input" type="number" placeholder="পরিমাণ" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                  </div>
                  <input className="input mt-2 mb-2" placeholder="বিবরণ" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
                  <button
                    className={btn}
                    disabled={busy}
                    onClick={async () => {
                      const amt = toMinor(payAmt);
                      if (!amt) return showToast("সঠিক পরিমাণ দিন", "error");
                      if (!window.confirm(`${r.name} — ${amt < 0 ? "কাটা হবে" : "জমা হবে"}: ${money(payCur, Math.abs(amt))}\nবর্তমান ব্যালেন্স: ${money(payCur, balOf(r.id, payCur))}\nনিশ্চিত?`)) return;
                      const ok = await run(() => telRpc("telecom_admin_adjust", { p_reseller: r.id, p_currency: payCur, p_amount: amt, p_note: payNote }), "সম্পন্ন");
                      if (ok) {
                        setPayAmt("");
                        setPayNote("");
                      }
                    }}
                  >
                    নিশ্চিত করুন
                  </button>
                  <div className="text-xs font-bold text-mute mt-4 mb-1">এই রিসেলারের শেষ লেনদেন</div>
                  {ledger.filter((l) => l.reseller_id === r.id).slice(0, 10).map((l) => (
                    <div key={l.id} className="text-[11px] border-t border-border py-1">
                      <div className="flex justify-between">
                        <span>{fmtDate(l.created_at)} · {TYPE_BN[l.type] ?? l.type}</span>
                        <b className={l.amount < 0 ? "text-red-600" : "text-teal-dark"}>{l.amount < 0 ? "−" : "+"}{money(l.currency, Math.abs(l.amount))}</b>
                      </div>
                      <div className="text-mute">{ledgerDetail(l)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "d" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-2">ডিপজিট যাচাই</div>
          {deps.length === 0 && <div className="text-xs text-mute">নেই</div>}
          {deps.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0 text-xs">
              <span>
                D{d.id} · {name(d.reseller_id)} · {d.method} · <b>{money(d.currency, d.amount)}</b>
                <br />
                <span className="text-mute">TrxID: {d.trx_id} · {fmtDate(d.created_at)}</span>
              </span>
              {d.status === "Pending" ? (
                <span className="flex gap-1 shrink-0">
                  <button className={btn} disabled={busy} onClick={() => run(() => telRpc("telecom_admin_decide_deposit", { p_id: d.id, p_approve: true }), "ক্রেডিট হয়েছে")}>ক্রেডিট</button>
                  <button className={btnRed} disabled={busy} onClick={() => run(() => telRpc("telecom_admin_decide_deposit", { p_id: d.id, p_approve: false }), "বাতিল")}>বাতিল</button>
                </span>
              ) : (
                <Pill s={d.status} />
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "q" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-2">রিচার্জ অর্ডার</div>
          {recharges.length === 0 && <div className="text-xs text-mute">নেই</div>}
          {recharges.map((o) => {
            const final = ["Completed", "Failed", "Cancelled"].includes(o.status);
            return (
              <div key={o.id} className="py-2 border-b border-border last:border-0 text-xs">
                <div className="flex items-center justify-between">
                  <span>
                    R{o.id} · {name(o.reseller_id)} · {o.operator} <b>{o.number}</b>
                    <br />
                    <span className="text-mute">{o.pack_name} · {money(o.currency, o.amount)} · {fmtDate(o.created_at)}</span>
                  </span>
                  <Pill s={o.status} />
                </div>
                {final ? (
                  <div className="text-mute mt-1">
                    {o.fulfil_ref && <>রেফ: {o.fulfil_ref} </>}
                    {o.refunded && "· টাকা ফেরত হয়েছে (একবারই)"}
                  </div>
                ) : (
                  <div className="mt-2">
                    <input className="input mb-2" placeholder="ফুলফিলমেন্ট রেফারেন্স (সম্পন্ন করতে লাগবে)" value={refs[o.id] ?? ""} onChange={(e) => setRefs({ ...refs, [o.id]: e.target.value })} />
                    <div className="flex gap-2">
                      <button className={btnGhost} disabled={busy} onClick={() => run(() => telRpc("telecom_admin_update_recharge", { p_id: o.id, p_status: "Processing", p_ref: "" }), "প্রসেসিং")}>প্রসেসিং</button>
                      <button className={btn} disabled={busy} onClick={() => run(() => telRpc("telecom_admin_update_recharge", { p_id: o.id, p_status: "Completed", p_ref: refs[o.id] ?? "" }), "সম্পন্ন")}>সম্পন্ন</button>
                      <button className={btnRed} disabled={busy} onClick={() => window.confirm("ব্যর্থ করে টাকা ফেরত দেবেন?") && run(() => telRpc("telecom_admin_update_recharge", { p_id: o.id, p_status: "Failed", p_ref: "" }), "ব্যর্থ, টাকা ফেরত")}>ব্যর্থ+রিফান্ড</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "b" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-1">পণ্য বিক্রির বিস্তারিত</div>
          <div className="text-[11px] text-mute mb-3">কে কী কিনেছে, কত টাকায়, কখন, কোন তথ্য (কোড/ইউজারনেম/পাসওয়ার্ড) পেয়েছে।</div>
          {orders.length === 0 && <div className="text-xs text-mute">এখনো কোনো বিক্রি নেই</div>}
          {orders.map((o) => (
            <div key={o.id} className="py-2.5 border-b border-border last:border-0 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-extrabold text-[13px]">{o.product_name}</div>
                  <div className="text-mute">
                    O{o.id} · {name(o.reseller_id)} · {fmtDate(o.created_at)}
                  </div>
                </div>
                <b className="shrink-0">{money(o.currency, o.amount)}</b>
              </div>
              <div className="mt-1.5 space-y-1">
                {parseSecret(o.secret).map((r, i) => (
                  <div key={i} className="bg-teal-tint rounded-lg px-2.5 py-1.5 font-mono break-all select-all">
                    {r.label ? `${r.label}: ` : ""}
                    {r.value}
                  </div>
                ))}
              </div>
              {o.expires_at && (
                <div className={`mt-1 font-bold ${isExpired(o.expires_at) ? "text-red-600" : "text-orange"}`}>মেয়াদ শেষ: {fmtDay(o.expires_at)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "p" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">নতুন পণ্য</div>
            <ProductFormFields v={np} set={setNp} uploading={uploading} onUpload={(f) => uploadImg(f, (url) => setNp((x) => ({ ...x, image_url: url })))} />
            <div className="text-[11px] text-mute my-2">যে কারেন্সির দাম ০ বা ফাঁকা, সেই কারেন্সিতে কেনা যাবে না। ক্যাটালগে "Calling Card" বা "VPN" লিখলে কাস্টমারের ওই আইকনে দেখাবে।</div>
            <button
              className={btn}
              disabled={busy || uploading || !np.name.trim()}
              onClick={async () => {
                const ok = await run(() => db(supabase.from("telecom_products").insert(prodPayload(np))), "পণ্য যোগ হয়েছে");
                if (ok) setNp(EMPTY_PROD);
              }}
            >
              যোগ করুন
            </button>
          </div>
          {products.map((p) => (
            <div key={p.id} className={card}>
              <div className="flex items-center gap-3">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-teal-tint flex items-center justify-center text-xl shrink-0">{p.icon}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm">{p.name}</div>
                  <div className="text-xs text-mute">
                    {money("BDT", p.price_bdt)} · {money("SAR", p.price_sar)} · {p.is_active ? "চালু" : "বন্ধ"} · স্টক: <b className="text-ink">{stockOf(p.id)}</b>
                  </div>
                </div>
              </div>

              {editProdId === p.id ? (
                <div className="mt-3 pt-3 border-t border-border">
                  <ProductFormFields v={ep} set={setEp} uploading={uploading} onUpload={(f) => uploadImg(f, (url) => setEp((x) => ({ ...x, image_url: url })))} />
                  <div className="flex gap-2 mt-2">
                    <button
                      className={btn}
                      disabled={busy || uploading || !ep.name.trim()}
                      onClick={async () => {
                        const ok = await run(() => db(supabase.from("telecom_products").update(prodPayload(ep)).eq("id", p.id)), "সংরক্ষিত");
                        if (ok) setEditProdId(null);
                      }}
                    >
                      সংরক্ষণ
                    </button>
                    <button className={btnGhost} onClick={() => setEditProdId(null)}>
                      বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={btnGhost + " mt-2"}
                  onClick={() => {
                    setEditProdId(p.id);
                    setEp({
                      name: p.name,
                      icon: p.icon,
                      bdt: p.price_bdt ? String(p.price_bdt / 100) : "",
                      sar: p.price_sar ? String(p.price_sar / 100) : "",
                      category: p.category ?? "",
                      description: p.description ?? "",
                      note: p.note ?? "",
                      validity: p.validity_days ? String(p.validity_days) : "",
                      image_url: p.image_url ?? ""
                    });
                  }}
                >
                  ✏ সম্পাদনা (ছবি, নোট, দাম)
                </button>
              )}

              <div className="text-xs font-bold text-mute mt-3 mb-1">স্টক যোগ করুন</div>
              <textarea
                className="input"
                rows={4}
                placeholder={"একটা কার্ডের সব তথ্য একসাথে লিখুন:\nOperator Code: 52390\nUsername: jh78722\nPassword: JH787\n\nএকাধিক কার্ড দিতে মাঝে একটা ফাঁকা লাইন রাখুন।"}
                value={stockText[p.id] ?? ""}
                onChange={(e) => setStockText({ ...stockText, [p.id]: e.target.value })}
              />
              <label className="flex items-center gap-2 text-[11px] mt-1">
                <input type="checkbox" checked={!!stockPerLine[p.id]} onChange={(e) => setStockPerLine({ ...stockPerLine, [p.id]: e.target.checked })} />
                প্রতি লাইনে আলাদা স্টক (যেমন গিফট কোডের তালিকা)
              </label>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-[11px] text-mute shrink-0">মেয়াদ শেষ (ঐচ্ছিক)</label>
                <input className="input" type="date" value={stockExp[p.id] ?? ""} onChange={(e) => setStockExp({ ...stockExp, [p.id]: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  className={btn}
                  disabled={busy || !(stockText[p.id] ?? "").trim()}
                  onClick={async () => {
                    const raw = (stockText[p.id] ?? "").replace(/\r/g, "");
                    const items = stockPerLine[p.id]
                      ? raw.split("\n").map((s) => s.trim()).filter(Boolean)
                      : raw.split(/\n\s*\n/).map((b) => b.split("\n").map((s) => s.trim()).filter(Boolean).join("\n")).filter(Boolean);
                    const exp = stockExp[p.id] || null;
                    const rows = items.map((secret) => ({ product_id: p.id, secret, expires_at: exp }));
                    const ok = await run(() => db(supabase.from("telecom_stock").insert(rows)), `${rows.length}টা স্টক যোগ হয়েছে`);
                    if (ok) setStockText({ ...stockText, [p.id]: "" });
                  }}
                >
                  স্টক যোগ
                </button>
                <button className={btnGhost} disabled={busy} onClick={() => run(() => db(supabase.from("telecom_products").update({ is_active: !p.is_active }).eq("id", p.id)), p.is_active ? "বন্ধ করা হয়েছে" : "চালু হয়েছে")}>
                  {p.is_active ? "বন্ধ করুন" : "চালু করুন"}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "s" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">বাংলাদেশ রিচার্জ রেট</div>
            <label className="text-xs font-bold text-mute block mb-1">কমিশন % (০–৫০)</label>
            <input className="input mb-2" type="number" value={settings.commission_pct} onChange={(e) => setSettings({ ...settings, commission_pct: Number(e.target.value) })} />
            <label className="text-xs font-bold text-mute block mb-1">ফ্ল্যাট চার্জ (BDT/SAR যে কারেন্সিতে অর্ডার, সেই অঙ্কে যোগ হয়)</label>
            <input className="input mb-2" type="number" value={settings.flat_charge / 100} onChange={(e) => setSettings({ ...settings, flat_charge: toMinor(e.target.value) })} />
            <label className="flex items-center gap-2 text-xs mb-2">
              <input type="checkbox" checked={settings.recharge_enabled} onChange={(e) => setSettings({ ...settings, recharge_enabled: e.target.checked })} />
              রিচার্জ চালু
            </label>
            <div className="text-[11px] text-mute mb-3">খরচ = দাম − কমিশন% + চার্জ</div>
            <label className="text-xs font-bold text-mute block mb-1">ডিপজিটের সাধারণ নির্দেশনা (রিসেলার দেখবে)</label>
            <textarea className="input mb-3" rows={3} value={settings.deposit_note} onChange={(e) => setSettings({ ...settings, deposit_note: e.target.value })} />
            <label className="text-xs font-bold text-mute block mb-1">সব পণ্যের নোট (কেনার পর সব কার্ডের উপরে ও রসিদে দেখাবে)</label>
            <textarea className="input mb-3" rows={3} placeholder="যেমন: কার্ড একবারই ব্যবহার করা যাবে। সমস্যা হলে যোগাযোগ করুন।" value={settings.purchase_note ?? ""} onChange={(e) => setSettings({ ...settings, purchase_note: e.target.value })} />
            <button
              className={btn}
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    db(
                      supabase.from("telecom_settings").update({
                        commission_pct: Math.max(0, Math.min(50, Number(settings.commission_pct) || 0)),
                        flat_charge: Math.max(0, Number(settings.flat_charge) || 0),
                        recharge_enabled: settings.recharge_enabled,
                        deposit_note: settings.deposit_note,
                        purchase_note: settings.purchase_note ?? "",
                        updated_at: new Date().toISOString()
                      }).eq("id", 1)
                    ),
                  "সংরক্ষিত"
                )
              }
            >
              সংরক্ষণ
            </button>
          </div>

          <div className={card}>
            <div className="font-extrabold text-sm mb-1">পেমেন্ট মাধ্যম (bKash / Nagad / Rocket)</div>
            <div className="text-[11px] text-mute mb-3">রিসেলার ডিপজিটের সময় এখানকার নম্বর দেখবে ও কপি করতে পারবে। ব্যাংক (IBAN/QR) যোগ করতে "🇸🇦 সৌদি" ট্যাবে "ব্যাংক" দেখুন।</div>
            {pays.map((m) => {
              const e = pmEdit[m.id] ?? {};
              const val = { ...m, ...e };
              return (
                <div key={m.id} className="border-t border-border pt-3 mt-3 first:border-0 first:pt-0 first:mt-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <b className="text-sm">{m.method}</b>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={val.is_active} onChange={(ev) => setPmEdit({ ...pmEdit, [m.id]: { ...e, is_active: ev.target.checked } })} />
                      চালু
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" placeholder="নম্বর" value={val.number} onChange={(ev) => setPmEdit({ ...pmEdit, [m.id]: { ...e, number: ev.target.value } })} />
                    <input className="input" placeholder="ধরন (Personal/Agent)" value={val.kind} onChange={(ev) => setPmEdit({ ...pmEdit, [m.id]: { ...e, kind: ev.target.value } })} />
                  </div>
                  <input className="input mt-2" placeholder="নির্দেশনা (যেমন সেন্ড মানি করে TrxID দিন)" value={val.instructions} onChange={(ev) => setPmEdit({ ...pmEdit, [m.id]: { ...e, instructions: ev.target.value } })} />
                  <button
                    className={btn + " mt-2"}
                    disabled={busy || !pmEdit[m.id]}
                    onClick={async () => {
                      const ok = await run(() => db(supabase.from("telecom_pay_methods").update({ number: val.number, kind: val.kind, instructions: val.instructions, is_active: val.is_active }).eq("id", m.id)), "সংরক্ষিত");
                      if (ok) {
                        const n = { ...pmEdit };
                        delete n[m.id];
                        setPmEdit(n);
                      }
                    }}
                  >
                    সংরক্ষণ
                  </button>
                </div>
              );
            })}
          </div>

          <div className={card}>
            <div className="font-extrabold text-sm mb-2">রিচার্জ প্যাকেজ</div>
            {packs.map((k) => (
              <div key={k.id} className="py-2 border-b border-border last:border-0 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    <b>{k.name}</b> · {money("BDT", k.price_bdt)} / {money("SAR", k.price_sar)} {k.is_active ? "" : "(বন্ধ)"}
                    <br />
                    <span className="text-mute">
                      {k.operator || "সব অপারেটর"} · {k.category || "Other"}
                      {k.validity_days ? ` · ${k.validity_days} দিন` : ""}
                      {k.tag ? ` · ${k.tag}` : ""}
                    </span>
                  </span>
                  <span className="flex gap-1 shrink-0">
                    <button
                      className={btnGhost}
                      onClick={() => {
                        setEditPackId(editPackId === k.id ? null : k.id);
                        setEpk({
                          name: k.name,
                          bdt: k.price_bdt ? String(k.price_bdt / 100) : "",
                          sar: k.price_sar ? String(k.price_sar / 100) : "",
                          operator: k.operator ?? "",
                          category: k.category ?? "Other",
                          validity: k.validity_days ? String(k.validity_days) : "",
                          tag: k.tag ?? ""
                        });
                      }}
                    >
                      ✏
                    </button>
                    <button className={btnGhost} disabled={busy} onClick={() => run(() => db(supabase.from("telecom_recharge_packs").update({ is_active: !k.is_active }).eq("id", k.id)), "সংরক্ষিত")}>
                      {k.is_active ? "বন্ধ" : "চালু"}
                    </button>
                  </span>
                </div>
                {editPackId === k.id && (
                  <div className="mt-2">
                    <PackFormFields v={epk} set={setEpk} />
                    <button
                      className={btn + " mt-2"}
                      disabled={busy || !epk.name.trim()}
                      onClick={async () => {
                        const ok = await run(() => db(supabase.from("telecom_recharge_packs").update(packPayload(epk)).eq("id", k.id)), "সংরক্ষিত");
                        if (ok) setEditPackId(null);
                      }}
                    >
                      সংরক্ষণ
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="font-bold text-xs mt-4 mb-2">নতুন প্যাকেজ</div>
            <PackFormFields v={nk} set={setNk} />
            <button
              className={btn + " mt-2"}
              disabled={busy || !nk.name.trim()}
              onClick={async () => {
                const ok = await run(() => db(supabase.from("telecom_recharge_packs").insert(packPayload(nk))), "প্যাকেজ যোগ হয়েছে");
                if (ok) setNk(EMPTY_PACK);
              }}
            >
              প্যাকেজ যোগ করুন
            </button>
          </div>
        </>
      )}

      {tab === "l" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-2">লেজার (শেষ ৩০০)</div>
          {ledger.length === 0 && <div className="text-xs text-mute">নেই</div>}
          {ledger.map((l) => (
            <div key={l.id} className="py-2 border-b border-border last:border-0 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div>
                    <b>{name(l.reseller_id)}</b> · {TYPE_BN[l.type] ?? l.type}
                  </div>
                  <div className="text-mute break-words">{ledgerDetail(l)}</div>
                  <div className="text-mute text-[10px]">{fmtDate(l.created_at)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-extrabold ${l.amount < 0 ? "text-red-600" : "text-teal-dark"}`}>
                    {l.amount < 0 ? "−" : "+"}
                    {money(l.currency, Math.abs(l.amount))}
                  </div>
                  <div className="text-mute text-[10px]">ব্যালেন্স {money(l.currency, l.balance_after)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
