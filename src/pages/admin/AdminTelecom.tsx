import React, { useCallback, useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import {
  Cur,
  TelDeposit,
  TelLedger,
  TelOrder,
  TelPack,
  TelProduct,
  TelRecharge,
  TelReseller,
  TelSettings,
  fmtDate,
  money,
  telErr,
  telRpc,
  toMinor
} from "../../services/telecomService";

type Tab = "o" | "r" | "d" | "q" | "p" | "s" | "l";
const TABS: { k: Tab; label: string }[] = [
  { k: "o", label: "📊 ওভারভিউ" },
  { k: "r", label: "👤 রিসেলার" },
  { k: "d", label: "💰 ডিপজিট" },
  { k: "q", label: "📲 রিচার্জ" },
  { k: "p", label: "🛍 পণ্য" },
  { k: "s", label: "⚙ সেটিংস" },
  { k: "l", label: "📒 লেজার" }
];

const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnRed = "press bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";

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
  const [settings, setSettings] = useState<TelSettings>({ commission_pct: 3, flat_charge: 0, recharge_enabled: true, deposit_note: "" });

  const [selId, setSelId] = useState<string | null>(null);
  const [payCur, setPayCur] = useState<Cur>("BDT");
  const [payAmt, setPayAmt] = useState("");
  const [payNote, setPayNote] = useState("");
  const [refs, setRefs] = useState<Record<number, string>>({});
  const [stockText, setStockText] = useState<Record<number, string>>({});
  const [np, setNp] = useState({ name: "", icon: "📦", bdt: "", sar: "" });
  const [nk, setNk] = useState({ name: "", bdt: "", sar: "" });

  const name = (id: string) => resellers.find((r) => r.id === id)?.name ?? id.slice(0, 6);

  const load = useCallback(async () => {
    const [r, w, d, rc, o, l, p, k, s, st] = await Promise.all([
      supabase.from("telecom_resellers").select("*").order("created_at", { ascending: false }),
      supabase.from("telecom_wallets").select("reseller_id,currency,balance"),
      supabase.from("telecom_deposits").select("*").order("id", { ascending: false }).limit(200),
      supabase.from("telecom_recharges").select("*").order("id", { ascending: false }).limit(200),
      supabase.from("telecom_orders").select("*").order("id", { ascending: false }).limit(500),
      supabase.from("telecom_ledger").select("*").order("id", { ascending: false }).limit(200),
      supabase.from("telecom_products").select("*").order("sort_order").order("id"),
      supabase.from("telecom_recharge_packs").select("*").order("sort_order").order("id"),
      supabase.from("telecom_settings").select("commission_pct,flat_charge,recharge_enabled,deposit_note").eq("id", 1).maybeSingle(),
      supabase.from("telecom_stock").select("product_id,status").eq("status", "available")
    ]);
    setResellers((r.data ?? []) as TelReseller[]);
    setWallets((w.data ?? []) as Wallet[]);
    setDeps((d.data ?? []) as TelDeposit[]);
    setRecharges((rc.data ?? []) as TelRecharge[]);
    setOrders((o.data ?? []) as TelOrder[]);
    setLedger((l.data ?? []) as TelLedger[]);
    setProducts((p.data ?? []) as TelProduct[]);
    setPacks((k.data ?? []) as TelPack[]);
    if (s.data) setSettings(s.data as TelSettings);
    setStock((st.data ?? []) as StockRow[]);
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

  const sum = (c: Cur) => wallets.filter((w) => w.currency === c).reduce((s, w) => s + Number(w.balance), 0);
  const depSum = (c: Cur) => deps.filter((d) => d.status === "Approved" && d.currency === c).reduce((s, d) => s + Number(d.amount), 0);
  const saleSum = (c: Cur) => orders.filter((o) => o.currency === c).reduce((s, o) => s + Number(o.amount), 0);
  const balOf = (rid: string, c: Cur) => Number(wallets.find((w) => w.reseller_id === rid && w.currency === c)?.balance ?? 0);
  const stockOf = (pid: number) => stock.filter((s) => s.product_id === pid).length;
  const sel = resellers.find((r) => r.id === selId) ?? null;

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
                    <div key={l.id} className="text-[11px] flex justify-between border-t border-border py-1">
                      <span>{fmtDate(l.created_at)} · {l.type}</span>
                      <b className={l.amount < 0 ? "text-red-600" : "text-teal-dark"}>{l.amount < 0 ? "−" : "+"}{money(l.currency, Math.abs(l.amount))}</b>
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

      {tab === "p" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">নতুন পণ্য</div>
            <div className="grid grid-cols-4 gap-2">
              <input className="input col-span-3" placeholder="নাম (যেমন Dollar Card $10)" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
              <input className="input" placeholder="আইকন" value={np.icon} onChange={(e) => setNp({ ...np, icon: e.target.value })} />
              <input className="input col-span-2" type="number" placeholder="দাম ৳ (BDT)" value={np.bdt} onChange={(e) => setNp({ ...np, bdt: e.target.value })} />
              <input className="input col-span-2" type="number" placeholder="দাম SAR" value={np.sar} onChange={(e) => setNp({ ...np, sar: e.target.value })} />
            </div>
            <div className="text-[11px] text-mute my-2">যে কারেন্সির দাম ০ বা ফাঁকা, সেই কারেন্সিতে কেনা যাবে না।</div>
            <button
              className={btn}
              disabled={busy || !np.name.trim()}
              onClick={async () => {
                const ok = await run(
                  () => db(supabase.from("telecom_products").insert({ name: np.name.trim(), icon: np.icon || "📦", price_bdt: toMinor(np.bdt), price_sar: toMinor(np.sar) })),
                  "পণ্য যোগ হয়েছে"
                );
                if (ok) setNp({ name: "", icon: "📦", bdt: "", sar: "" });
              }}
            >
              যোগ করুন
            </button>
          </div>
          {products.map((p) => (
            <div key={p.id} className={card}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm">{p.icon} {p.name}</span>
                <span className="text-xs text-mute">স্টক: <b className="text-ink">{stockOf(p.id)}</b></span>
              </div>
              <div className="text-xs text-mute mt-1">{money("BDT", p.price_bdt)} · {money("SAR", p.price_sar)} · {p.is_active ? "চালু" : "বন্ধ"}</div>
              <textarea
                className="input mt-2"
                rows={3}
                placeholder={"স্টক যোগ করুন: প্রতি লাইনে একটা কোড/পাসওয়ার্ড"}
                value={stockText[p.id] ?? ""}
                onChange={(e) => setStockText({ ...stockText, [p.id]: e.target.value })}
              />
              <div className="flex gap-2 mt-1">
                <button
                  className={btn}
                  disabled={busy || !(stockText[p.id] ?? "").trim()}
                  onClick={async () => {
                    const rows = (stockText[p.id] ?? "").split("\n").map((s) => s.trim()).filter(Boolean).map((secret) => ({ product_id: p.id, secret }));
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
            <label className="text-xs font-bold text-mute block mb-1">ডিপজিটের নির্দেশনা (রিসেলার দেখবে: কোন নম্বরে টাকা পাঠাবে)</label>
            <textarea className="input mb-3" rows={3} value={settings.deposit_note} onChange={(e) => setSettings({ ...settings, deposit_note: e.target.value })} />
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
            <div className="font-extrabold text-sm mb-2">রিচার্জ প্যাকেজ</div>
            {packs.map((k) => (
              <div key={k.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                <span>{k.name} · {money("BDT", k.price_bdt)} / {money("SAR", k.price_sar)} {k.is_active ? "" : "(বন্ধ)"}</span>
                <button className={btnGhost} disabled={busy} onClick={() => run(() => db(supabase.from("telecom_recharge_packs").update({ is_active: !k.is_active }).eq("id", k.id)), "সংরক্ষিত")}>
                  {k.is_active ? "বন্ধ" : "চালু"}
                </button>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input className="input col-span-2" placeholder="প্যাকেজের নাম (যেমন মোবাইল রিচার্জ ১০০)" value={nk.name} onChange={(e) => setNk({ ...nk, name: e.target.value })} />
              <input className="input" type="number" placeholder="দাম ৳" value={nk.bdt} onChange={(e) => setNk({ ...nk, bdt: e.target.value })} />
              <input className="input" type="number" placeholder="দাম SAR" value={nk.sar} onChange={(e) => setNk({ ...nk, sar: e.target.value })} />
            </div>
            <button
              className={btn + " mt-2"}
              disabled={busy || !nk.name.trim()}
              onClick={async () => {
                const ok = await run(() => db(supabase.from("telecom_recharge_packs").insert({ name: nk.name.trim(), price_bdt: toMinor(nk.bdt), price_sar: toMinor(nk.sar) })), "প্যাকেজ যোগ হয়েছে");
                if (ok) setNk({ name: "", bdt: "", sar: "" });
              }}
            >
              প্যাকেজ যোগ করুন
            </button>
          </div>
        </>
      )}

      {tab === "l" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-2">লেজার (শেষ ২০০)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-mute">
                  <th className="py-1 pr-2">সময়</th>
                  <th className="pr-2">রিসেলার</th>
                  <th className="pr-2">ধরন</th>
                  <th className="pr-2">পরিমাণ</th>
                  <th>ব্যালেন্স</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id} className="border-t border-border whitespace-nowrap">
                    <td className="py-1 pr-2">{fmtDate(l.created_at)}</td>
                    <td className="pr-2">{name(l.reseller_id)}</td>
                    <td className="pr-2">{l.type}</td>
                    <td className={`pr-2 font-bold ${l.amount < 0 ? "text-red-600" : "text-teal-dark"}`}>{l.amount < 0 ? "−" : "+"}{money(l.currency, Math.abs(l.amount))}</td>
                    <td>{money(l.currency, l.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
