import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Smartphone } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import {
  Cur,
  METHODS,
  OPERATORS,
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

type Tab = "w" | "s" | "c" | "h";
const TABS: { k: Tab; label: string }[] = [
  { k: "w", label: "👛 ওয়ালেট" },
  { k: "s", label: "🛍 পণ্য" },
  { k: "c", label: "📶 রিচার্জ" },
  { k: "h", label: "🧾 ইতিহাস" }
];

const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60";

function StatusPill({ s }: { s: string }) {
  const color =
    s === "Approved" || s === "Completed"
      ? "text-teal-dark bg-teal-tint"
      : s === "Pending" || s === "Processing"
      ? "text-orange bg-orange-tint"
      : "text-red-600 bg-red-50";
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>{s}</span>;
}

export default function TelecomReseller() {
  const { showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [logged, setLogged] = useState(false);
  const [me, setMe] = useState<TelReseller | null>(null);
  const [tab, setTab] = useState<Tab>("w");
  const [bal, setBal] = useState<Record<Cur, number>>({ BDT: 0, SAR: 0 });
  const [deps, setDeps] = useState<TelDeposit[]>([]);
  const [products, setProducts] = useState<TelProduct[]>([]);
  const [packs, setPacks] = useState<TelPack[]>([]);
  const [orders, setOrders] = useState<TelOrder[]>([]);
  const [recharges, setRecharges] = useState<TelRecharge[]>([]);
  const [ledger, setLedger] = useState<TelLedger[]>([]);
  const [settings, setSettings] = useState<TelSettings | null>(null);
  const [busy, setBusy] = useState(false);

  // আবেদন ফর্ম
  const [aName, setAName] = useState("");
  const [aCountry, setACountry] = useState("");
  const [aMobile, setAMobile] = useState("");
  // ডিপজিট ফর্ম
  const [dMethod, setDMethod] = useState("bKash");
  const [dCur, setDCur] = useState<Cur>("BDT");
  const [dAmount, setDAmount] = useState("");
  const [dTrx, setDTrx] = useState("");
  // রিচার্জ ফর্ম
  const [rOp, setROp] = useState(OPERATORS[0]);
  const [rNum, setRNum] = useState("");
  const [rPack, setRPack] = useState("");
  const [rCur, setRCur] = useState<Cur>("BDT");

  const load = useCallback(async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      setLogged(false);
      setReady(true);
      return;
    }
    setLogged(true);
    const { data: r } = await supabase.from("telecom_resellers").select("*").eq("user_id", session.user.id).maybeSingle();
    setMe((r as TelReseller) ?? null);
    if (r && (r as TelReseller).status === "Approved") {
      const [w, d, p, k, o, rc, l, s] = await Promise.all([
        supabase.from("telecom_wallets").select("currency,balance"),
        supabase.from("telecom_deposits").select("*").order("id", { ascending: false }).limit(50),
        supabase.from("telecom_products").select("*").eq("is_active", true).order("sort_order").order("id"),
        supabase.from("telecom_recharge_packs").select("*").eq("is_active", true).order("sort_order").order("id"),
        supabase.from("telecom_orders").select("*").order("id", { ascending: false }).limit(50),
        supabase.from("telecom_recharges").select("*").order("id", { ascending: false }).limit(50),
        supabase.from("telecom_ledger").select("*").order("id", { ascending: false }).limit(100),
        supabase.from("telecom_settings").select("commission_pct,flat_charge,recharge_enabled,deposit_note").eq("id", 1).maybeSingle()
      ]);
      const b: Record<Cur, number> = { BDT: 0, SAR: 0 };
      (w.data ?? []).forEach((x: { currency: Cur; balance: number }) => (b[x.currency] = Number(x.balance)));
      setBal(b);
      setDeps((d.data ?? []) as TelDeposit[]);
      setProducts((p.data ?? []) as TelProduct[]);
      setPacks((k.data ?? []) as TelPack[]);
      setOrders((o.data ?? []) as TelOrder[]);
      setRecharges((rc.data ?? []) as TelRecharge[]);
      setLedger((l.data ?? []) as TelLedger[]);
      setSettings((s.data as TelSettings) ?? null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, okMsg: string) {
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

  if (!ready) return <div className="p-8 text-center text-mute text-sm">লোড হচ্ছে…</div>;

  const header = (
    <div className="bg-teal rounded-2xl p-5 text-white flex items-center gap-3 mb-3">
      <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
        <Smartphone size={22} />
      </div>
      <div>
        <div className="font-bold text-sm">J H Telecom Reseller</div>
        <div className="text-white/80 text-xs">{me ? `${me.name} · ${me.country || ""}` : "রিসেলার সেবা"}</div>
      </div>
    </div>
  );

  if (!logged) {
    return (
      <div className="px-4 pt-4 pb-6">
        {header}
        <div className={card + " text-center"}>
          <div className="text-sm mb-3">রিসেলার সেবা ব্যবহার করতে আগে লগইন করুন।</div>
          <Link to="/account" className={btn + " inline-block"}>
            লগইন / নতুন অ্যাকাউন্ট
          </Link>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="px-4 pt-4 pb-6">
        {header}
        <div className={card}>
          <div className="font-extrabold text-sm mb-1">রিসেলার হওয়ার আবেদন</div>
          <div className="text-[11px] text-mute mb-3">অ্যাডমিন অনুমোদন দিলে ওয়ালেট, পণ্য কেনা ও রিচার্জ চালু হবে।</div>
          <input className="input mb-2" placeholder="আপনার নাম" value={aName} onChange={(e) => setAName(e.target.value)} />
          <input className="input mb-2" placeholder="দেশ (যেমন KSA)" value={aCountry} onChange={(e) => setACountry(e.target.value)} />
          <input className="input mb-3" placeholder="মোবাইল নম্বর" value={aMobile} onChange={(e) => setAMobile(e.target.value)} />
          <button
            className={btn + " w-full"}
            disabled={busy}
            onClick={() => run(() => telRpc("telecom_apply", { p_name: aName, p_country: aCountry, p_mobile: aMobile }), "আবেদন জমা হয়েছে")}
          >
            আবেদন করুন
          </button>
        </div>
      </div>
    );
  }

  if (me.status !== "Approved") {
    return (
      <div className="px-4 pt-4 pb-6">
        {header}
        <div className={card + " text-center"}>
          <div className="mb-2">
            <StatusPill s={me.status} />
          </div>
          <div className="text-sm">
            {me.status === "Pending" && "আপনার আবেদন যাচাই চলছে। অনুমোদনের পর সেবা চালু হবে।"}
            {me.status === "Rejected" && "আপনার আবেদন গ্রহণ করা হয়নি। যোগাযোগ করুন।"}
            {me.status === "Suspended" && "আপনার রিসেলার অ্যাকাউন্ট সাময়িক বন্ধ আছে। যোগাযোগ করুন।"}
          </div>
        </div>
      </div>
    );
  }

  const selPack = packs.find((p) => String(p.id) === rPack);
  const baseOf = (p: TelPack, c: Cur) => (c === "BDT" ? p.price_bdt : p.price_sar);
  const cost = (p: TelPack, c: Cur) =>
    Math.round(baseOf(p, c) * (1 - Number(settings?.commission_pct ?? 0) / 100)) + Number(settings?.flat_charge ?? 0);
  const allowedMethods = METHODS.filter((m) => me.perm?.[m]);

  return (
    <div className="px-4 pt-4 pb-6">
      {header}
      <div className="grid grid-cols-4 gap-1 bg-teal-tint p-1 rounded-xl mb-3">
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`press text-[11px] font-bold py-2 rounded-lg ${tab === t.k ? "bg-white text-teal-dark shadow" : "text-teal-dark/60"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "w" && (
        <>
          <div className={card}>
            <div className="text-xs font-bold text-mute mb-2">ওয়ালেট (দুই কারেন্সির ব্যালেন্স আলাদা)</div>
            <div className="grid grid-cols-2 gap-2">
              {(["BDT", "SAR"] as Cur[]).map((c) => (
                <div key={c} className="bg-teal-tint rounded-xl p-3">
                  <div className="text-[11px] text-mute font-bold">{c}</div>
                  <div className="text-lg font-extrabold text-teal-dark">{money(c, bal[c])}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={card}>
            <div className="font-extrabold text-sm mb-2">ডিপজিট অনুরোধ</div>
            {settings?.deposit_note && (
              <div className="text-[11px] bg-orange-tint text-ink rounded-lg p-2.5 mb-3 whitespace-pre-line">{settings.deposit_note}</div>
            )}
            {allowedMethods.length === 0 ? (
              <div className="text-xs text-mute">আপনার জন্য কোনো পেমেন্ট মাধ্যম চালু নেই।</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <select className="input" value={dMethod} onChange={(e) => setDMethod(e.target.value)}>
                    {allowedMethods.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                  <select className="input" value={dCur} onChange={(e) => setDCur(e.target.value as Cur)}>
                    <option>BDT</option>
                    <option>SAR</option>
                  </select>
                </div>
                <input className="input mt-2" type="number" placeholder="পরিমাণ (যেমন 2000)" value={dAmount} onChange={(e) => setDAmount(e.target.value)} />
                <input className="input mt-2 mb-3" placeholder="ট্রানজেকশন ID" value={dTrx} onChange={(e) => setDTrx(e.target.value)} />
                <button
                  className={btn + " w-full"}
                  disabled={busy}
                  onClick={async () => {
                    const ok = await run(
                      () =>
                        telRpc("telecom_request_deposit", {
                          p_method: allowedMethods.includes(dMethod as (typeof METHODS)[number]) ? dMethod : allowedMethods[0],
                          p_currency: dCur,
                          p_amount: toMinor(dAmount),
                          p_trx: dTrx
                        }),
                      "অনুরোধ জমা হয়েছে। অ্যাডমিন যাচাই করলে ব্যালেন্স বাড়বে।"
                    );
                    if (ok) {
                      setDAmount("");
                      setDTrx("");
                    }
                  }}
                >
                  জমা দিন
                </button>
              </>
            )}
          </div>

          <div className={card}>
            <div className="font-extrabold text-sm mb-2">আমার ডিপজিট</div>
            {deps.length === 0 ? (
              <div className="text-xs text-mute">কোনো ডিপজিট নেই</div>
            ) : (
              deps.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-xs">
                  <span>
                    #{d.id} · {d.method} · {money(d.currency, d.amount)}
                    <br />
                    <span className="text-mute">{d.trx_id}</span>
                  </span>
                  <StatusPill s={d.status} />
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "s" && (
        <>
          {products.length === 0 && <div className="text-xs text-mute text-center py-6">এখন কোনো পণ্য নেই</div>}
          {products.map((p) => (
            <div key={p.id} className={card}>
              <div className="font-extrabold text-sm mb-1">
                {p.icon} {p.name}
              </div>
              <div className="text-[11px] text-mute mb-3">🔒 কোড/পাসওয়ার্ড কেনার পর ইতিহাসে দেখা যাবে</div>
              <div className="flex gap-2">
                {p.price_bdt > 0 && (
                  <button
                    className={btn + " flex-1"}
                    disabled={busy}
                    onClick={() =>
                      window.confirm(`${p.name} — ${money("BDT", p.price_bdt)} BDT ওয়ালেট থেকে কাটা হবে। কিনবেন?`) &&
                      run(() => telRpc("telecom_buy", { p_product: p.id, p_currency: "BDT" }), "কেনা সম্পন্ন। ইতিহাসে দেখুন।")
                    }
                  >
                    {money("BDT", p.price_bdt)} এ কিনুন
                  </button>
                )}
                {p.price_sar > 0 && (
                  <button
                    className={btnGhost + " flex-1"}
                    disabled={busy}
                    onClick={() =>
                      window.confirm(`${p.name} — ${money("SAR", p.price_sar)} SAR ওয়ালেট থেকে কাটা হবে। কিনবেন?`) &&
                      run(() => telRpc("telecom_buy", { p_product: p.id, p_currency: "SAR" }), "কেনা সম্পন্ন। ইতিহাসে দেখুন।")
                    }
                  >
                    {money("SAR", p.price_sar)} এ কিনুন
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "c" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">বাংলাদেশ রিচার্জ (ম্যানুয়াল)</div>
            {!settings?.recharge_enabled || !me.perm?.Bangladesh ? (
              <div className="text-xs text-mute">বাংলাদেশ রিচার্জ এখন বন্ধ আছে।</div>
            ) : (
              <>
                <select className="input mb-2" value={rOp} onChange={(e) => setROp(e.target.value)}>
                  {OPERATORS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <input
                  className="input mb-2"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="মোবাইল নম্বর 01XXXXXXXXX"
                  value={rNum}
                  onChange={(e) => setRNum(e.target.value.replace(/\D/g, ""))}
                />
                <select className="input mb-2" value={rPack} onChange={(e) => setRPack(e.target.value)}>
                  <option value="">প্যাকেজ বেছে নিন</option>
                  {packs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select className="input mb-2" value={rCur} onChange={(e) => setRCur(e.target.value as Cur)}>
                  <option>BDT</option>
                  <option>SAR</option>
                </select>
                {selPack && baseOf(selPack, rCur) > 0 && (
                  <div className="text-xs text-mute mb-3">আপনার খরচ: <b className="text-ink">{money(rCur, cost(selPack, rCur))}</b></div>
                )}
                <button
                  className={btn + " w-full"}
                  disabled={busy || !selPack}
                  onClick={async () => {
                    const ok = await run(
                      () => telRpc("telecom_request_recharge", { p_operator: rOp, p_number: rNum, p_pack: Number(rPack), p_currency: rCur }),
                      "অর্ডার তৈরি। অ্যাডমিন ম্যানুয়ালি প্রক্রিয়া করবে।"
                    );
                    if (ok) setRNum("");
                  }}
                >
                  অর্ডার দিন
                </button>
              </>
            )}
          </div>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">রিচার্জ অর্ডার</div>
            {recharges.length === 0 ? (
              <div className="text-xs text-mute">নেই</div>
            ) : (
              recharges.map((o) => (
                <div key={o.id} className="py-2 border-b border-border last:border-0 text-xs">
                  <div className="flex items-center justify-between">
                    <span>
                      R{o.id} · {o.operator} {o.number}
                      <br />
                      <span className="text-mute">
                        {o.pack_name} · {money(o.currency, o.amount)}
                      </span>
                    </span>
                    <StatusPill s={o.status} />
                  </div>
                  {o.fulfil_ref && <div className="text-mute mt-1">রেফ: {o.fulfil_ref}</div>}
                  {o.refunded && <div className="text-mute mt-1">টাকা ফেরত হয়েছে</div>}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "h" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">আমার কেনা পণ্য</div>
            {orders.length === 0 ? (
              <div className="text-xs text-mute">নেই</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="mb-3 text-xs">
                  <b>
                    O{o.id} · {o.product_name}
                  </b>{" "}
                  <span className="text-mute">{money(o.currency, o.amount)}</span>
                  <div className="mt-1 bg-teal-tint rounded-lg px-2.5 py-2 font-mono break-all select-all">{o.secret}</div>
                </div>
              ))
            )}
          </div>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">ওয়ালেট লেনদেন</div>
            {ledger.length === 0 ? (
              <div className="text-xs text-mute">কোনো লেনদেন নেই</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-mute">
                      <th className="py-1 pr-2">সময়</th>
                      <th className="pr-2">ধরন</th>
                      <th className="pr-2">পরিমাণ</th>
                      <th>ব্যালেন্স</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((l) => (
                      <tr key={l.id} className="border-t border-border whitespace-nowrap">
                        <td className="py-1 pr-2">{fmtDate(l.created_at)}</td>
                        <td className="pr-2">{l.type}</td>
                        <td className={`pr-2 font-bold ${l.amount < 0 ? "text-red-600" : "text-teal-dark"}`}>
                          {l.amount < 0 ? "−" : "+"}
                          {money(l.currency, Math.abs(l.amount))}
                        </td>
                        <td>{money(l.currency, l.balance_after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
