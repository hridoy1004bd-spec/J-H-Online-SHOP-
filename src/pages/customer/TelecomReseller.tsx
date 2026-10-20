import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Eye, EyeOff, Smartphone } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import TelecomReceipt, { ReceiptData } from "../../components/TelecomReceipt";
import SaudiShop from "../../components/SaudiShop";
import BdTopup from "../../components/BdTopup";
import MobileBanking from "../../components/MobileBanking";
import { bdErr, parseBankSms, smsKey, uploadProof } from "../../services/bdService";
import { BankAccount } from "../../services/saudiService";
import {
  Cur,
  METHOD_COLOR,
  PinError,
  TelDeposit,
  TelLedger,
  TelOrder,
  TelPack,
  TelPayMethod,
  TelProduct,
  TelRecharge,
  TelReseller,
  TelSettings,
  copyText,
  fmtDate,
  fmtDay,
  isExpired,
  money,
  parseSecret,
  secretToText,
  telErr,
  telRpc,
  telRpcPin,
  toMinor
} from "../../services/telecomService";

type View = "home" | "deposit" | "shop" | "recharge" | "mb" | "saudi" | "history" | "ledger" | "pin";

const TILES: { k: View; icon: string; label: string; cat?: string; tab?: "topup" | "drive" }[] = [
  { k: "deposit", icon: "💰", label: "Add Money" },
  { k: "recharge", icon: "📱", label: "BD Topup", tab: "topup" },
  { k: "recharge", icon: "🌐", label: "Drive Offer", tab: "drive" },
  { k: "mb", icon: "🏦", label: "Mobile Banking" },
  { k: "saudi", icon: "🇸🇦", label: "Saudi Voucher" },
  { k: "shop", icon: "🛍", label: "পণ্য" },
  { k: "shop", icon: "🎫", label: "Calling Card", cat: "call" },
  { k: "shop", icon: "🛡️", label: "VPN Cards", cat: "vpn" },
  { k: "history", icon: "🧾", label: "My Card" },
  { k: "ledger", icon: "📒", label: "Ledger" },
  { k: "pin", icon: "🔐", label: "PIN" }
];

const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60";

const TYPE_BN: Record<string, string> = {
  Deposit: "ডিপোজিট",
  Purchase: "পণ্য কেনা",
  "Recharge hold": "রিচার্জ (টাকা আটকানো)",
  Refund: "ফেরত",
  "Admin payment": "অ্যাডমিন পেমেন্ট"
};

function StatusPill({ s }: { s: string }) {
  const color =
    s === "Approved" || s === "Completed"
      ? "text-teal-dark bg-teal-tint"
      : s === "Pending" || s === "Processing"
      ? "text-orange bg-orange-tint"
      : "text-red-600 bg-red-50";
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>{s}</span>;
}

/** নিচ থেকে ওঠা শিট: পিন চায় */
function PinSheet({
  title,
  lines,
  label,
  onSubmit,
  onClose
}: {
  title: string;
  lines: string[];
  label: string;
  onSubmit: (pin: string) => Promise<void>;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    setErr("");
    try {
      await onSubmit(pin);
      onClose();
    } catch (e) {
      setErr(telErr(e));
      setPin("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-end justify-center" onClick={busy ? undefined : onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="font-extrabold text-base mb-2">{title}</div>
        <div className="bg-teal-tint rounded-xl p-3 text-xs text-ink mb-3 space-y-1">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <label className="text-xs font-bold text-mute mb-1 block">আপনার পিন দিন</label>
        <input
          className="input text-center tracking-[0.5em] text-lg"
          type="password"
          inputMode="numeric"
          autoFocus
          maxLength={6}
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && pin.length >= 4 && !busy && go()}
        />
        {err && <div className="text-xs font-bold text-red-600 mt-2">{err}</div>}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button className={btnGhost} disabled={busy} onClick={onClose}>
            বাতিল
          </button>
          <button className={btn} disabled={busy || pin.length < 4} onClick={go}>
            {busy ? "অপেক্ষা করুন…" : label}
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyRow({ label, value, onDone }: { label: string; value: string; onDone: (ok: boolean) => void }) {
  return (
    <div className="flex items-center gap-2 bg-teal-tint rounded-xl px-3 py-2">
      <div className="flex-1 min-w-0">
        {label && <div className="text-[10px] font-bold text-mute">{label}</div>}
        <div className="font-mono text-[13px] font-bold text-ink break-all select-all">{value}</div>
      </div>
      <button className="press shrink-0 bg-white rounded-lg p-2 text-teal-dark border border-border" aria-label="কপি" onClick={async () => onDone(await copyText(value))}>
        <Copy size={14} />
      </button>
    </div>
  );
}

export default function TelecomReseller() {
  const { showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [logged, setLogged] = useState(false);
  const [me, setMe] = useState<TelReseller | null>(null);
  const [view, setView] = useState<View>("home");
  const [bal, setBal] = useState<Record<Cur, number>>({ BDT: 0, SAR: 0 });
  const [hide, setHide] = useState(false);
  const [deps, setDeps] = useState<TelDeposit[]>([]);
  const [products, setProducts] = useState<TelProduct[]>([]);
  const [packs, setPacks] = useState<TelPack[]>([]);
  const [orders, setOrders] = useState<TelOrder[]>([]);
  const [recharges, setRecharges] = useState<TelRecharge[]>([]);
  const [ledger, setLedger] = useState<TelLedger[]>([]);
  const [settings, setSettings] = useState<TelSettings | null>(null);
  const [waNum, setWaNum] = useState("");
  const [pays, setPays] = useState<TelPayMethod[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [pinAsk, setPinAsk] = useState<{ title: string; lines: string[]; label: string; run: (pin: string) => Promise<void> } | null>(null);
  const [shopCat, setShopCat] = useState("all");

  // আবেদন ফর্ম
  const [aName, setAName] = useState("");
  const [aCountry, setACountry] = useState("");
  const [aMobile, setAMobile] = useState("");
  // ডিপজিট
  const [dMethod, setDMethod] = useState("");
  const [dCur, setDCur] = useState<Cur>("BDT");
  const [dAmount, setDAmount] = useState("");
  const [dTrx, setDTrx] = useState("");
  const [rTab, setRTab] = useState<"topup" | "drive">("topup");
  // ব্যাংক ডিপজিট প্রুফ
  const [dSms, setDSms] = useState("");
  const [dFile, setDFile] = useState<File | null>(null);
  // পিন
  const [pOld, setPOld] = useState("");
  const [pNew, setPNew] = useState("");
  const [pNew2, setPNew2] = useState("");

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
      const [w, d, p, k, o, rc, l, s, pm, ps, bk] = await Promise.all([
        supabase.from("telecom_wallets").select("currency,balance").eq("reseller_id", (r as TelReseller).id),
        supabase.from("telecom_deposits").select("*").eq("reseller_id", (r as TelReseller).id).order("id", { ascending: false }).limit(50),
        supabase.from("telecom_products").select("*").eq("is_active", true).order("sort_order").order("id"),
        supabase.from("telecom_recharge_packs").select("*").eq("is_active", true).order("sort_order").order("id"),
        supabase.from("telecom_orders").select("*").eq("reseller_id", (r as TelReseller).id).order("id", { ascending: false }).limit(50),
        supabase.from("telecom_recharges").select("*").eq("reseller_id", (r as TelReseller).id).order("id", { ascending: false }).limit(50),
        supabase.from("telecom_ledger").select("*").eq("reseller_id", (r as TelReseller).id).order("id", { ascending: false }).limit(100),
        supabase.from("telecom_settings").select("commission_pct,flat_charge,recharge_enabled,deposit_note,purchase_note,whatsapp_number").eq("id", 1).maybeSingle(),
        supabase.from("telecom_pay_methods").select("*").eq("is_active", true).order("sort_order"),
        supabase.rpc("telecom_pin_status"),
        supabase.from("telecom_bank_accounts").select("*").eq("is_active", true).order("sort_order").order("id")
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
      setWaNum(((s.data as { whatsapp_number?: string } | null)?.whatsapp_number) ?? "");
      setPays((pm.data ?? []) as TelPayMethod[]);
      setBanks((bk.data ?? []) as BankAccount[]);
      setPinSet(ps.error ? null : Boolean(ps.data));
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
      showToast(bdErr(e), "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const toast = (m: string, t: "success" | "error" = "success") => showToast(m, t);

  const shopCats = useMemo(() => Array.from(new Set(products.map((p) => (p.category ?? "").trim()).filter(Boolean))), [products]);
  const shownProducts = useMemo(() => {
    if (shopCat === "all") return products;
    if (shopCat === "call" || shopCat === "vpn") {
      const key = shopCat === "call" ? "call" : "vpn";
      return products.filter((p) => `${p.category ?? ""} ${p.name}`.toLowerCase().includes(key));
    }
    return products.filter((p) => (p.category ?? "").trim() === shopCat);
  }, [products, shopCat]);

  function orderReceipt(o: TelOrder): ReceiptData {
    return {
      heading: "পণ্য কেনার রসিদ",
      title: o.product_name,
      orderNo: `O${o.id}`,
      date: fmtDate(o.created_at),
      amountText: money(o.currency, o.amount),
      rows: parseSecret(o.secret),
      expires: o.expires_at ? fmtDay(o.expires_at) : null,
      note: [settings?.purchase_note, o.note].filter((x) => x && String(x).trim()).join("\n\n")
    };
  }
  function rechargeReceipt(o: TelRecharge): ReceiptData {
    return {
      heading: "রিচার্জ রসিদ",
      title: o.pack_name,
      orderNo: `R${o.id}`,
      date: fmtDate(o.created_at),
      amountText: money(o.currency, o.amount),
      status: o.status,
      info: [
        { label: "অপারেটর", value: o.operator },
        { label: "নম্বর", value: o.number },
        ...(o.fulfil_ref ? [{ label: "রেফারেন্স", value: o.fulfil_ref }] : [])
      ],
      rows: [],
      note: ""
    };
  }

  function needPinFirst(): boolean {
    if (pinSet === false) {
      showToast("কেনার আগে একটি ৪–৬ সংখ্যার পিন সেট করুন", "error");
      setView("pin");
      return true;
    }
    return false;
  }

  function askBuy(p: TelProduct, c: Cur) {
    if (needPinFirst()) return;
    const price = c === "BDT" ? p.price_bdt : p.price_sar;
    setPinAsk({
      title: "কেনা নিশ্চিত করুন",
      lines: [`পণ্য: ${p.name}`, `মূল্য: ${money(c, price)}`, `${c} ওয়ালেট থেকে কাটা হবে`],
      label: "কিনুন",
      run: async (pin) => {
        const res = await telRpcPin("telecom_buy_pin", { p_product: p.id, p_currency: c, p_pin: pin });
        await load();
        showToast("কেনা সম্পন্ন", "success");
        if (res.id) {
          const { data } = await supabase.from("telecom_orders").select("*").eq("id", res.id).maybeSingle();
          if (data) setReceipt(orderReceipt(data as TelOrder));
        }
      }
    });
  }

  if (!ready) return <div className="p-8 text-center text-mute text-sm">লোড হচ্ছে…</div>;

  const titleOf: Record<View, string> = {
    home: "J H Telecom Reseller",
    deposit: "Add Money",
    shop: "পণ্য",
    recharge: "Mobile Recharge",
    mb: "Mobile Banking",
    saudi: "Saudi Voucher",
    history: "My Card / History",
    ledger: "Ledger",
    pin: "PIN"
  };

  const header = (
    <div className="bg-teal rounded-2xl p-5 text-white mb-3">
      <div className="flex items-center gap-3">
        {view !== "home" && me?.status === "Approved" ? (
          <button className="press w-10 h-10 rounded-full bg-white/15 flex items-center justify-center" onClick={() => setView("home")} aria-label="পেছনে">
            <ArrowLeft size={18} />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <Smartphone size={20} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{titleOf[view]}</div>
          <div className="text-white/80 text-xs truncate">{me ? `${me.name}${me.country ? " · " + me.country : ""}` : "রিসেলার সেবা"}</div>
        </div>
        {me?.status === "Approved" && (
          <button className="press p-2 text-white/90" onClick={() => setHide(!hide)} aria-label="ব্যালেন্স দেখা/লুকানো">
            {hide ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {me?.status === "Approved" && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {(["BDT", "SAR"] as Cur[]).map((c) => (
            <div key={c} className="bg-white/15 rounded-xl px-3 py-2.5">
              <div className="text-[10px] font-bold text-white/70">{c} ব্যালেন্স</div>
              <div className="text-lg font-extrabold">{hide ? "••••" : money(c, bal[c])}</div>
            </div>
          ))}
        </div>
      )}
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
          <button className={btn + " w-full"} disabled={busy} onClick={() => run(() => telRpc("telecom_apply", { p_name: aName, p_country: aCountry, p_mobile: aMobile }), "আবেদন জমা হয়েছে")}>
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

  const activePays = pays.filter((m) => me.perm?.[m.method as "bKash"]);
  const hasBank = banks.length > 0;
  const curMethod = dMethod === "Bank" ? undefined : activePays.find((m) => m.method === dMethod) ?? (dMethod === "" ? activePays[0] : undefined);
  const bankMode = dMethod === "Bank" || (activePays.length === 0 && hasBank);

  // লেনদেনের বিস্তারিত (রেফ ধরে অর্ডার/রিচার্জ/ডিপজিটের তথ্য মেলানো)
  function ledgerDetail(l: TelLedger): { text: string; order?: TelOrder; rch?: TelRecharge } {
    const ref = l.ref || "";
    if (/^O\d+$/.test(ref)) {
      const o = orders.find((x) => `O${x.id}` === ref);
      return { text: o ? `${o.product_name} · অর্ডার ${ref}` : `${l.note} · অর্ডার ${ref}`, order: o };
    }
    if (/^R\d+$/.test(ref)) {
      const r = recharges.find((x) => `R${x.id}` === ref);
      return { text: r ? `${r.operator} ${r.number} · ${r.pack_name} · ${ref}` : `${l.note} · ${ref}`, rch: r };
    }
    if (/^M\d+$/.test(ref)) {
      return { text: `মোবাইল ব্যাংকিং ${ref} · ${l.note}` };
    }
    if (/^S\d+$/.test(ref)) {
      return { text: `সৌদি অর্ডার ${ref} · ${l.note}` };
    }
    if (/^D\d+/.test(ref)) {
      const id = Number(ref.slice(1).split("/")[0]);
      const d = deps.find((x) => x.id === id);
      return { text: d ? `${d.method} · TrxID ${d.trx_id}` : `${l.note} · ${ref}` };
    }
    return { text: [l.note, ref].filter(Boolean).join(" · ") };
  }

  return (
    <div className="px-4 pt-4 pb-8">
      {header}

      {view === "home" && (
        <>
          <div className="bg-teal-tint text-teal-dark rounded-full px-4 py-2.5 text-[12px] font-semibold mb-4 truncate">📢 {settings?.deposit_note?.trim() ? settings.deposit_note.split("\n")[0] : "J H Telecom: ডিপোজিট, রিচার্জ, সৌদি ভাউচার ও কার্ড এক জায়গায়"}</div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 mb-4">
            {TILES.map((t) => (
              <button
                key={t.label}
                onClick={() => {
                  if (t.k === "shop") setShopCat(t.cat ?? "all");
                  if (t.k === "recharge") setRTab(t.tab ?? "topup");
                  setView(t.k);
                }}
                className="press flex flex-col items-center gap-1.5"
              >
                <span className="w-14 h-14 rounded-2xl bg-teal-tint flex items-center justify-center text-2xl">{t.icon}</span>
                <span className="text-[11px] font-semibold text-ink leading-tight text-center">{t.label}</span>
              </button>
            ))}
          </div>
          {pinSet === false && (
            <div className="bg-orange-tint rounded-2xl p-3 text-xs mb-3 flex items-center justify-between gap-2">
              <span>🔐 কেনার আগে একটি পিন সেট করুন।</span>
              <button className={btn} onClick={() => setView("pin")}>
                পিন সেট
              </button>
            </div>
          )}
          <div className="rounded-2xl p-5 text-white mb-3 bg-gradient-to-br from-[#1c2f78] to-[#3d62d6]">
            <div className="font-extrabold text-lg">J H Telecom</div>
            <div className="text-xs opacity-85 mt-1">বাংলাদেশের সব সিম রিচার্জ · সৌদি ভাউচার · কলিং ও VPN কার্ড</div>
          </div>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">সাম্প্রতিক লেনদেন</div>
            {ledger.length === 0 ? (
              <div className="text-xs text-mute">কোনো লেনদেন নেই</div>
            ) : (
              ledger.slice(0, 4).map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-xs gap-2">
                  <span className="min-w-0">
                    <b>{TYPE_BN[l.type] ?? l.type}</b>
                    <br />
                    <span className="text-mute truncate block">{ledgerDetail(l).text}</span>
                  </span>
                  <b className={`shrink-0 ${l.amount < 0 ? "text-red-600" : "text-teal-dark"}`}>
                    {l.amount < 0 ? "−" : "+"}
                    {money(l.currency, Math.abs(l.amount))}
                  </b>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {view === "saudi" && (
        <SaudiShop resellerId={me.id} bal={bal} pinSet={pinSet} whatsapp={waNum} onChanged={load} onToast={toast} onNeedPin={() => setView("pin")} />
      )}

      {view === "deposit" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-3">Add Money (ওয়ালেটে টাকা যোগ)</div>
            {activePays.length === 0 && !hasBank ? (
              <div className="text-xs text-mute">আপনার জন্য কোনো পেমেন্ট মাধ্যম চালু নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {activePays.map((m) => {
                    const on = !bankMode && curMethod?.method === m.method;
                    const col = METHOD_COLOR[m.method] ?? "#2F7D6D";
                    return (
                      <button
                        key={m.id}
                        onClick={() => setDMethod(m.method)}
                        className="press rounded-xl py-2.5 text-[13px] font-extrabold border-2"
                        style={on ? { background: col, color: "#fff", borderColor: col } : { color: col, borderColor: col + "55", background: "transparent" }}
                      >
                        {m.method}
                      </button>
                    );
                  })}
                  {hasBank && (
                    <button
                      onClick={() => {
                        setDMethod("Bank");
                        setDCur((banks[0]?.currency as Cur) === "BDT" ? "BDT" : "SAR");
                      }}
                      className={`press rounded-xl py-2.5 text-[13px] font-extrabold border-2 ${bankMode ? "bg-ink text-white border-ink" : "border-ink/40 text-ink"}`}
                    >
                      🏦 Bank
                    </button>
                  )}
                </div>

                {bankMode ? (
                  <div className="space-y-3 mb-3">
                    {banks.map((b) => (
                      <div key={b.id} className="rounded-xl border border-border p-3">
                        <div className="font-extrabold text-sm">{b.bank_name}</div>
                        {b.account_name && <div className="text-xs text-mute mb-2">{b.account_name}</div>}
                        <CopyRow label="IBAN" value={b.iban} onDone={(ok) => toast(ok ? "IBAN কপি হয়েছে" : "কপি করা গেল না", ok ? "success" : "error")} />
                        {b.qr_url && <img src={b.qr_url} alt="QR" className="w-44 h-44 object-contain mx-auto mt-3 rounded-lg bg-white border border-border" />}
                        {b.instructions && <div className="text-[11px] text-ink mt-2 whitespace-pre-line">{b.instructions}</div>}
                      </div>
                    ))}
                    <div className="text-[11px] text-mute">টাকা পাঠানোর পর নিচে পরিমাণ দিন এবং ব্যাংকের মেসেজ বা স্ক্রিনশট দিয়ে জমা দিন।</div>
                  </div>
                ) : (
                  curMethod && (
                    <div className="rounded-xl p-3 mb-3" style={{ background: (METHOD_COLOR[curMethod.method] ?? "#2F7D6D") + "18" }}>
                      {curMethod.number ? (
                        <CopyRow label={`${curMethod.method} নম্বর${curMethod.kind ? " (" + curMethod.kind + ")" : ""}`} value={curMethod.number} onDone={(ok) => toast(ok ? "নম্বর কপি হয়েছে" : "কপি করা গেল না", ok ? "success" : "error")} />
                      ) : (
                        <div className="text-xs text-mute">এই মাধ্যমের নম্বর এখনো দেওয়া হয়নি।</div>
                      )}
                      {curMethod.instructions && <div className="text-[11px] text-ink mt-2 whitespace-pre-line">{curMethod.instructions}</div>}
                    </div>
                  )
                )}
                {settings?.deposit_note && <div className="text-[11px] bg-orange-tint text-ink rounded-lg p-2.5 mb-3 whitespace-pre-line">{settings.deposit_note}</div>}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {(["BDT", "SAR"] as Cur[]).map((c) => (
                    <button key={c} onClick={() => setDCur(c)} className={`press rounded-xl py-2 text-sm font-bold ${dCur === c ? "bg-teal text-white" : "bg-teal-tint text-teal-dark"}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <input className="input mb-2" type="number" inputMode="decimal" placeholder="পরিমাণ (যেমন 2000)" value={dAmount} onChange={(e) => setDAmount(e.target.value)} />
                {bankMode ? (
                  <>
                    <label className="text-xs font-bold text-mute block mb-1">ব্যাংকের মেসেজ (SMS) পেস্ট করুন</label>
                    <textarea
                      className="input mb-2"
                      rows={4}
                      placeholder={"যেমন:\nOnline Purchase\nBy:9627;mada-Apple Pay\nFrom:3413\nAmount:SR 1000\nAt:barq\n14/10/26 18:04"}
                      value={dSms}
                      onChange={(e) => {
                        setDSms(e.target.value);
                        const g = parseBankSms(e.target.value);
                        if (g && !dAmount) {
                          setDAmount(g.amount);
                          setDCur(g.cur);
                        }
                      }}
                    />
                    <label className="text-xs font-bold text-mute block mb-1">অথবা স্ক্রিনশট দিন</label>
                    <input className="input mb-1" type="file" accept="image/*" onChange={(e) => setDFile(e.target.files?.[0] ?? null)} />
                    {dFile && <div className="text-[11px] text-teal-dark mb-2">নির্বাচিত: {dFile.name}</div>}
                    <div className="text-[11px] text-mute mb-3">মেসেজ অথবা স্ক্রিনশট, যেকোনো একটা দিলেই হবে। স্ক্রিনশট শুধু আপনি ও অ্যাডমিন দেখবে।</div>
                  </>
                ) : (
                  <input className="input mb-3" placeholder="ট্রানজেকশন ID" value={dTrx} onChange={(e) => setDTrx(e.target.value)} />
                )}
                <button
                  className={btn + " w-full"}
                  disabled={busy || (!bankMode && !curMethod)}
                  onClick={async () => {
                    const method = bankMode ? "Bank" : curMethod!.method;
                    if (bankMode && dSms.trim().length < 10 && !dFile) return showToast("ব্যাংকের মেসেজ পেস্ট করুন অথবা স্ক্রিনশট দিন", "error");
                    const ok = await run(async () => {
                      let proofUrl: string | null = null;
                      if (bankMode && dFile) proofUrl = await uploadProof(dFile);
                      const trx = bankMode ? (dSms.trim().length >= 10 ? await smsKey(dSms) : "") : dTrx;
                      await telRpc("telecom_request_deposit2", {
                        p_method: method,
                        p_currency: dCur,
                        p_amount: toMinor(dAmount),
                        p_trx: trx,
                        p_proof_text: bankMode ? dSms.trim() : "",
                        p_proof_url: proofUrl,
                        p_sender: ""
                      });
                    }, "অনুরোধ জমা হয়েছে। অ্যাডমিন যাচাই করলে ব্যালেন্স বাড়বে।");
                    if (ok) {
                      setDAmount("");
                      setDTrx("");
                      setDSms("");
                      setDFile(null);
                    }
                  }}
                >
                  জমা দিন
                </button>
              </>
            )}
          </div>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">আমার ডিপোজিট</div>
            {deps.length === 0 ? (
              <div className="text-xs text-mute">কোনো ডিপোজিট নেই</div>
            ) : (
              deps.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-xs">
                  <span>
                    #{d.id} · {d.method} · {money(d.currency, d.amount)}
                    <br />
                    <span className="text-mute">
                      {d.trx_id} · {fmtDate(d.created_at)}
                    </span>
                  </span>
                  <StatusPill s={d.status} />
                </div>
              ))
            )}
          </div>
        </>
      )}

      {view === "shop" && (
        <>
          {(shopCats.length > 0 || shopCat !== "all") && (
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
              {[
                { k: "all", l: "সব" },
                { k: "call", l: "Calling Card" },
                { k: "vpn", l: "VPN" },
                ...shopCats.filter((c) => !/call|vpn/i.test(c)).map((c) => ({ k: c, l: c }))
              ].map((c) => (
                <button key={c.k} onClick={() => setShopCat(c.k)} className={`press shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${shopCat === c.k ? "bg-teal text-white" : "bg-teal-tint text-teal-dark"}`}>
                  {c.l}
                </button>
              ))}
            </div>
          )}
          {shownProducts.length === 0 && <div className="text-xs text-mute text-center py-6">এখন কোনো পণ্য নেই</div>}
          {shownProducts.map((p) => (
            <div key={p.id} className={card}>
              <div className="flex gap-3">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} loading="lazy" className="w-16 h-16 rounded-xl object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-teal-tint flex items-center justify-center text-3xl shrink-0">{p.icon}</div>
                )}
                <div className="min-w-0">
                  <div className="font-extrabold text-sm leading-snug">{p.name}</div>
                  {p.validity_days ? <div className="text-[11px] text-mute mt-0.5">মেয়াদ {p.validity_days} দিন</div> : null}
                  {p.description ? <div className="text-[11px] text-mute mt-1 whitespace-pre-line">{p.description}</div> : null}
                </div>
              </div>
              <div className="text-[11px] text-mute my-3">🔒 কোড/পাসওয়ার্ড কেনার পর রসিদে ও "My Card" এ দেখা যাবে</div>
              <div className="flex gap-2">
                {p.price_bdt > 0 && (
                  <button className={btn + " flex-1"} disabled={busy} onClick={() => askBuy(p, "BDT")}>
                    {money("BDT", p.price_bdt)} এ কিনুন
                  </button>
                )}
                {p.price_sar > 0 && (
                  <button className={btnGhost + " flex-1"} disabled={busy} onClick={() => askBuy(p, "SAR")}>
                    {money("SAR", p.price_sar)} এ কিনুন
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {view === "recharge" && (
        <BdTopup
          key={rTab}
          bal={bal.BDT}
          settings={settings}
          enabled={Boolean(settings?.recharge_enabled) && Boolean(me.perm?.Bangladesh)}
          packs={packs}
          recharges={recharges}
          pinSet={pinSet}
          startTab={rTab}
          onChanged={load}
          onToast={toast}
          onNeedPin={() => setView("pin")}
          onReceipt={(o) => setReceipt(rechargeReceipt(o))}
        />
      )}

      {view === "mb" && <MobileBanking bal={bal.BDT} flat={Number(settings?.flat_charge ?? 0)} pinSet={pinSet} onChanged={load} onToast={toast} onNeedPin={() => setView("pin")} />}

      {view === "history" && (
        <>
          {settings?.purchase_note && settings.purchase_note.trim() && (
            <div className="bg-orange-tint rounded-2xl p-3.5 text-xs text-ink mb-3 whitespace-pre-line">📌 {settings.purchase_note}</div>
          )}
          {orders.length === 0 && <div className="text-xs text-mute text-center py-6">এখনো কোনো পণ্য কেনেননি</div>}
          {orders.map((o) => {
            const rows = parseSecret(o.secret);
            return (
              <div key={o.id} className={card}>
                <div className="flex items-start gap-3">
                  {o.image_url ? (
                    <img src={o.image_url} alt="" loading="lazy" className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-teal-tint flex items-center justify-center text-xl shrink-0">🛍</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm leading-snug">{o.product_name}</div>
                    <div className="text-[11px] text-mute">
                      O{o.id} · {fmtDate(o.created_at)}
                    </div>
                  </div>
                  <div className="font-extrabold text-sm shrink-0">{money(o.currency, o.amount)}</div>
                </div>
                {o.note && o.note.trim() && <div className="mt-3 text-[11px] bg-orange-tint rounded-xl p-2.5 text-ink whitespace-pre-line">📌 {o.note}</div>}
                <div className="mt-3 space-y-2">
                  {rows.map((r, i) => (
                    <CopyRow key={i} label={r.label} value={r.value} onDone={(ok) => toast(ok ? "কপি হয়েছে" : "কপি করা গেল না", ok ? "success" : "error")} />
                  ))}
                </div>
                {o.expires_at && (
                  <div className={`mt-2 text-[11px] font-bold ${isExpired(o.expires_at) ? "text-red-600" : "text-orange"}`}>
                    মেয়াদ শেষ: {fmtDay(o.expires_at)} {isExpired(o.expires_at) ? "(শেষ হয়ে গেছে)" : ""}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    className={btnGhost}
                    onClick={async () => {
                      const ok = await copyText(secretToText(rows));
                      toast(ok ? "সব তথ্য কপি হয়েছে" : "কপি করা গেল না", ok ? "success" : "error");
                    }}
                  >
                    সব কপি
                  </button>
                  <button className={btn} onClick={() => setReceipt(orderReceipt(o))}>
                    রসিদ / শেয়ার
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {view === "ledger" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-2">ওয়ালেট লেনদেন</div>
          {ledger.length === 0 ? (
            <div className="text-xs text-mute">কোনো লেনদেন নেই</div>
          ) : (
            ledger.map((l) => {
              const d = ledgerDetail(l);
              return (
                <div key={l.id} className="py-2.5 border-b border-border last:border-0 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-[13px]">{TYPE_BN[l.type] ?? l.type}</div>
                      <div className="text-mute break-words">{d.text}</div>
                      <div className="text-mute text-[10px] mt-0.5">{fmtDate(l.created_at)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-extrabold text-[13px] ${l.amount < 0 ? "text-red-600" : "text-teal-dark"}`}>
                        {l.amount < 0 ? "−" : "+"}
                        {money(l.currency, Math.abs(l.amount))}
                      </div>
                      <div className="text-mute text-[10px]">ব্যালেন্স {money(l.currency, l.balance_after)}</div>
                    </div>
                  </div>
                  {d.order && (
                    <button className="press text-teal-dark font-bold mt-1" onClick={() => setReceipt(orderReceipt(d.order!))}>
                      রসিদ দেখুন
                    </button>
                  )}
                  {d.rch && (
                    <button className="press text-teal-dark font-bold mt-1" onClick={() => setReceipt(rechargeReceipt(d.rch!))}>
                      রসিদ দেখুন
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {view === "pin" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-1">{pinSet ? "পিন বদলান" : "পিন সেট করুন"}</div>
          <div className="text-[11px] text-mute mb-3">পণ্য কেনা ও রিচার্জ অর্ডারের সময় এই পিন চাওয়া হবে। ৪ থেকে ৬ সংখ্যা। ভুলে গেলে অ্যাডমিন রিসেট করে দেবে।</div>
          {pinSet && <input className="input mb-2" type="password" inputMode="numeric" maxLength={6} placeholder="বর্তমান পিন" value={pOld} onChange={(e) => setPOld(e.target.value.replace(/\D/g, ""))} />}
          <input className="input mb-2" type="password" inputMode="numeric" maxLength={6} placeholder="নতুন পিন" value={pNew} onChange={(e) => setPNew(e.target.value.replace(/\D/g, ""))} />
          <input className="input mb-3" type="password" inputMode="numeric" maxLength={6} placeholder="নতুন পিন আবার" value={pNew2} onChange={(e) => setPNew2(e.target.value.replace(/\D/g, ""))} />
          <button
            className={btn + " w-full"}
            disabled={busy || pNew.length < 4}
            onClick={async () => {
              if (pNew !== pNew2) return showToast("দুইবার একই পিন দিন", "error");
              const ok = await run(async () => {
                const res = await telRpc<{ ok: boolean; error?: string; left?: number }>("telecom_set_pin", { p_new: pNew, p_old: pinSet ? pOld : null });
                if (!res || res.ok === false) throw new PinError(res?.error ?? "PIN_WRONG", res?.left);
              }, "পিন সংরক্ষিত হয়েছে");
              if (ok) {
                setPOld("");
                setPNew("");
                setPNew2("");
                setView("home");
              }
            }}
          >
            সংরক্ষণ
          </button>
        </div>
      )}

      {receipt && <TelecomReceipt data={receipt} onClose={() => setReceipt(null)} onToast={toast} />}
      {pinAsk && <PinSheet title={pinAsk.title} lines={pinAsk.lines} label={pinAsk.label} onSubmit={pinAsk.run} onClose={() => setPinAsk(null)} />}
    </div>
  );
}
