import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { fmtDate, money, telRpcPin, toMinor } from "../services/telecomService";
import { bdErr } from "../services/bdService";

export interface MbOrder {
  id: number;
  reseller_id: string;
  method: string;
  acc_type: string;
  account: string;
  currency: string;
  amount: number;
  cost: number;
  status: string;
  fulfil_ref: string;
  refunded: boolean;
  created_at: string;
}

interface Props {
  bal: number;
  flat: number;
  pinSet: boolean | null;
  onChanged: () => void | Promise<void>;
  onToast: (m: string, t?: "success" | "error") => void;
  onNeedPin: () => void;
}

const METHODS: { k: string; bn: string; short: string; color: string }[] = [
  { k: "Nagad", bn: "নগদ/Nagad", short: "নগ", color: "#f47216" },
  { k: "bKash", bn: "বিকাশ/bKash", short: "bK", color: "#d7195b" },
  { k: "Rocket", bn: "রকেট/Rocket", short: "Rk", color: "#8c2d8f" }
];
const CHIPS = ["500", "1000", "2000", "5000"];

function Pill({ s }: { s: string }) {
  const color = s === "Completed" ? "text-teal-dark bg-teal-tint" : s === "Pending" || s === "Processing" ? "text-orange bg-orange-tint" : "text-red-600 bg-red-50";
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>{s}</span>;
}

function Step({ n, t }: { n: number; t: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4">
      <span className="w-6 h-6 rounded-lg bg-[#2b4797] text-white text-xs font-extrabold flex items-center justify-center">{n}</span>
      <span className="font-extrabold text-sm">{t}</span>
    </div>
  );
}

export default function MobileBanking({ bal, flat, pinSet, onChanged, onToast, onNeedPin }: Props) {
  const [method, setMethod] = useState("");
  const [type, setType] = useState<"Personal" | "Agent" | "">("");
  const [acc, setAcc] = useState("");
  const [amt, setAmt] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<MbOrder[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("telecom_mb_orders").select("*").order("id", { ascending: false }).limit(50);
    setList((data ?? []) as MbOrder[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const amtMinor = toMinor(amt);
  const cost = amtMinor > 0 ? amtMinor + flat : 0;
  const accOk = /^01[3-9][0-9]{8}$/.test(acc);
  const ready = !!method && !!type && accOk && amtMinor >= 5000 && pin.length >= 4;

  async function submit() {
    if (pinSet === false) {
      onToast("আগে একটি পিন সেট করুন", "error");
      onNeedPin();
      return;
    }
    if (cost > bal) return onToast("ওয়ালেটে পর্যাপ্ত BDT ব্যালেন্স নেই", "error");
    setBusy(true);
    try {
      await telRpcPin("telecom_request_mb", { p_method: method, p_type: type, p_account: acc, p_amount: amtMinor, p_pin: pin });
      onToast("অনুরোধ জমা হয়েছে। অ্যাডমিন পাঠিয়ে দেবে।", "success");
      setAcc("");
      setAmt("");
      setPin("");
      setType("");
      setMethod("");
      await Promise.all([load(), onChanged()]);
    } catch (e) {
      onToast(bdErr(e), "error");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  const card = "bg-white border border-border rounded-2xl p-4 mb-3";
  return (
    <>
      <div className={card}>
        <Step n={1} t="Select Banking Method" />
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button key={m.k} onClick={() => setMethod(m.k)} className={`press rounded-2xl py-3 flex flex-col items-center gap-1.5 border-2 ${method === m.k ? "border-[#2b4797] bg-[#2b4797]/5" : "border-border bg-white"}`}>
              <span className="w-11 h-11 rounded-xl text-white font-extrabold flex items-center justify-center" style={{ background: m.color }}>
                {m.short}
              </span>
              <span className="text-[11px] font-bold">{m.bn}</span>
            </button>
          ))}
        </div>

        <Step n={2} t="Select Account Type" />
        <div className="grid grid-cols-2 gap-2">
          {(["Personal", "Agent"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)} className={`press rounded-xl py-3 text-sm font-bold border-2 ${type === t ? "bg-[#2b4797] text-white border-[#2b4797]" : "border-border bg-white"}`}>
              {t}
            </button>
          ))}
        </div>

        <Step n={3} t="Transaction Details" />
        <label className="text-xs font-bold text-mute block mb-1">Account Number</label>
        <input className="input mb-3" inputMode="numeric" maxLength={11} placeholder="01XXXXXXXXX" value={acc} onChange={(e) => setAcc(e.target.value.replace(/\D/g, ""))} />
        <label className="text-xs font-bold text-mute block mb-1">Amount</label>
        <input className="input mb-2" type="number" inputMode="decimal" placeholder="৳ 0.00" value={amt} onChange={(e) => setAmt(e.target.value)} />
        <div className="grid grid-cols-4 gap-2 mb-1">
          {CHIPS.map((c) => (
            <button key={c} onClick={() => setAmt(c)} className="press rounded-lg border border-border bg-white py-2 text-sm font-bold text-[#2b4797]">
              {Number(c).toLocaleString("en-US")}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-mute mb-3">
          Available Balance: <b className="text-ink">{money("BDT", bal)}</b> · সর্বনিম্ন ৳50
          {cost > 0 && (
            <>
              {" "}· আপনার খরচ: <b className="text-ink">{money("BDT", cost)}</b>
            </>
          )}
        </div>
        <label className="text-xs font-bold text-mute block mb-1">PIN</label>
        <div className="relative mb-4">
          <input className="input pr-12" type={showPin ? "text" : "password"} inputMode="numeric" maxLength={6} placeholder="Enter your PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          <button type="button" className="press absolute right-3 top-1/2 -translate-y-1/2 text-xs text-mute font-bold" onClick={() => setShowPin(!showPin)}>
            {showPin ? "লুকান" : "দেখুন"}
          </button>
        </div>
        <button className="press w-full rounded-2xl bg-[#2b4797] text-white font-extrabold py-4 disabled:opacity-50" disabled={busy || !ready} onClick={submit}>
          {busy ? "অপেক্ষা করুন…" : "Submit Request →"}
        </button>
        <div className="text-[11px] text-mute mt-2">অ্যাডমিন নম্বরে টাকা পাঠিয়ে সম্পন্ন করবে। ব্যর্থ হলে টাকা ফেরত যাবে।</div>
      </div>

      <div className={card}>
        <div className="font-extrabold text-sm mb-2">আমার অনুরোধ</div>
        {list.length === 0 ? (
          <div className="text-xs text-mute">নেই</div>
        ) : (
          list.map((o) => (
            <div key={o.id} className="py-2 border-b border-border last:border-0 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span>
                  M{o.id} · {o.method} ({o.acc_type}) {o.account}
                  <br />
                  <span className="text-mute">
                    {money("BDT", o.amount)} · খরচ {money("BDT", o.cost)} · {fmtDate(o.created_at)}
                  </span>
                </span>
                <Pill s={o.status} />
              </div>
              {o.fulfil_ref && <div className="text-mute mt-1">রেফ: {o.fulfil_ref}</div>}
              {o.refunded && <div className="text-mute mt-1">টাকা ফেরত হয়েছে</div>}
            </div>
          ))
        )}
      </div>
    </>
  );
}
