import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { fmtDate, money, telRpcPin, toMinor } from "../../services/telecomService";
import { TelRequest, svcErr } from "../../services/resellerService";

export type ReqKind = "manual_drive" | "e_drive" | "bill_payment";

const BLUE = "#2b4797";
const MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const OPS = ["Grameenphone", "Robi", "Banglalink", "Airtel", "Teletalk"];
const BILLS = [
  "BPDB Prepaid (বিদ্যুৎ)",
  "BPDB Postpaid (বিদ্যুৎ)",
  "DESCO Prepaid (বিদ্যুৎ)",
  "DESCO Postpaid (বিদ্যুৎ)",
  "DPDC Postpaid (বিদ্যুৎ)",
  "NESCO (বিদ্যুৎ)",
  "West Zone / WZPDCL (বিদ্যুৎ)",
  "Palli Bidyut (বিদ্যুৎ)",
  "Titas Gas (গ্যাস)",
  "WASA (পানি)",
  "Internet / Broadband",
  "অন্যান্য বিল"
];

const META: Record<ReqKind, { title: string; accLabel: string; accHint: string; amtLabel: string; noteLabel: string; info: string }> = {
  manual_drive: {
    title: "Manual Drive",
    accLabel: "মোবাইল নম্বর",
    accHint: "01XXXXXXXXX",
    amtLabel: "প্যাকেজের মূল্য (৳)",
    noteLabel: "কোন প্যাকেজ / অফার (যেমন: ২০GB ৩০ দিন)",
    info: "প্যাকেজ লিখে অনুরোধ দিন। অ্যাডমিন নিজে ড্রাইভ অফার চালু করে সম্পন্ন করবে। ব্যর্থ হলে টাকা ফেরত যাবে।"
  },
  e_drive: {
    title: "E Drive",
    accLabel: "মোবাইল নম্বর",
    accHint: "01XXXXXXXXX",
    amtLabel: "প্যাকেজের মূল্য (৳)",
    noteLabel: "কোন E-Drive প্যাকেজ (যেমন: ১০GB ৭ দিন)",
    info: "E-Drive প্যাকেজের অনুরোধ। অ্যাডমিন সম্পন্ন করলে রেফারেন্স দেখা যাবে।"
  },
  bill_payment: {
    title: "Bill Payment",
    accLabel: "মিটার / গ্রাহক / অ্যাকাউন্ট নম্বর",
    accHint: "Meter or Customer No.",
    amtLabel: "বিলের পরিমাণ (৳)",
    noteLabel: "নোট (ঐচ্ছিক)",
    info: "বিলের তথ্য দিন। অ্যাডমিন বিল পরিশোধ করে রেফারেন্স দেবে। ব্যর্থ হলে টাকা ফেরত যাবে।"
  }
};

function Pill({ s }: { s: string }) {
  const color = s === "Completed" ? "text-teal-dark bg-teal-tint" : s === "Pending" || s === "Processing" ? "text-orange bg-orange-tint" : "text-red-600 bg-red-50";
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>{s}</span>;
}

interface Props {
  kind: ReqKind;
  bal: number;
  pinSet: boolean | null;
  onChanged: () => void | Promise<void>;
  onToast: (m: string, t?: "success" | "error") => void;
  onNeedPin: () => void;
}

export default function ServiceRequest({ kind, bal, pinSet, onChanged, onToast, onNeedPin }: Props) {
  const m = META[kind];
  const [provider, setProvider] = useState("");
  const [acc, setAcc] = useState("");
  const [amt, setAmt] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<TelRequest[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("telecom_requests").select("*").eq("kind", kind).order("id", { ascending: false }).limit(40);
    setList((data ?? []) as TelRequest[]);
  }, [kind]);
  useEffect(() => {
    load();
  }, [load]);

  const providers = kind === "bill_payment" ? BILLS : OPS;
  const amtMinor = toMinor(amt);
  const accOk = kind === "bill_payment" ? acc.trim().length >= 3 : /^01[3-9][0-9]{8}$/.test(acc);
  const ready = !!provider && accOk && amtMinor >= 1000 && pin.length >= 4 && (kind === "bill_payment" || note.trim().length >= 2);

  async function submit() {
    if (pinSet === false) {
      onToast("আগে একটি পিন সেট করুন", "error");
      onNeedPin();
      return;
    }
    if (amtMinor > bal) return onToast("ওয়ালেটে পর্যাপ্ত BDT ব্যালেন্স নেই", "error");
    setBusy(true);
    try {
      const fullNote = kind === "bill_payment" ? [`মাস: ${month}`, note.trim()].filter(Boolean).join(" · ") : note.trim();
      await telRpcPin("telecom_request_service", { p_kind: kind, p_provider: provider, p_account: acc.trim(), p_amount: amtMinor, p_note: fullNote, p_pin: pin });
      onToast("অনুরোধ জমা হয়েছে", "success");
      setAcc("");
      setAmt("");
      setNote("");
      setPin("");
      await Promise.all([load(), onChanged()]);
    } catch (e) {
      onToast(svcErr(e), "error");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  const card = "bg-white border border-border rounded-2xl p-4 mb-3";
  return (
    <>
      <div className={card}>
        <div className="font-extrabold text-sm mb-1">{m.title}</div>
        <div className="text-[11px] text-mute mb-3">{m.info}</div>
        <label className="text-xs font-bold text-mute block mb-1">{kind === "bill_payment" ? "Operator / বিলের ধরন" : "Operator"}</label>
        <select className="input mb-3" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">নির্বাচন করুন</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="text-xs font-bold text-mute block mb-1">{m.accLabel}</label>
        <input className="input mb-3" inputMode={kind === "bill_payment" ? "text" : "numeric"} maxLength={kind === "bill_payment" ? 40 : 11} placeholder={m.accHint} value={acc} onChange={(e) => setAcc(kind === "bill_payment" ? e.target.value : e.target.value.replace(/\D/g, ""))} />
        {kind === "bill_payment" && (
          <>
            <label className="text-xs font-bold text-mute block mb-1">Month</label>
            <select className="input mb-3" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </>
        )}
        <label className="text-xs font-bold text-mute block mb-1">{m.amtLabel}</label>
        <input className="input mb-1" type="number" inputMode="decimal" placeholder="৳ 0.00" value={amt} onChange={(e) => setAmt(e.target.value)} />
        <div className="text-[11px] text-mute mb-3">
          Available Balance: <b className="text-ink">{money("BDT", bal)}</b> · সর্বনিম্ন ৳10
        </div>
        <label className="text-xs font-bold text-mute block mb-1">{m.noteLabel}</label>
        <input className="input mb-3" value={note} onChange={(e) => setNote(e.target.value)} />
        <label className="text-xs font-bold text-mute block mb-1">PIN</label>
        <input className="input mb-4" type="password" inputMode="numeric" maxLength={6} placeholder="Enter your PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        <button className="press w-full rounded-2xl text-white font-extrabold py-4 disabled:opacity-50" style={{ background: BLUE }} disabled={busy || !ready} onClick={submit}>
          {busy ? "অপেক্ষা করুন…" : `Submit ${m.title} →`}
        </button>
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
                  Q{o.id} · {o.provider} · {o.account}
                  <br />
                  <span className="text-mute">
                    {money("BDT", o.amount)} · খরচ {money("BDT", o.cost)} · {fmtDate(o.created_at)}
                  </span>
                  {o.note && (
                    <>
                      <br />
                      <span className="text-mute">{o.note}</span>
                    </>
                  )}
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
