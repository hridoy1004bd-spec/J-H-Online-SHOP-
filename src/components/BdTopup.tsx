import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { OPERATORS, PACK_CATEGORIES, TelPack, TelRecharge, TelSettings, detectOperator, fmtDate, money, telRpcPin, toMinor } from "../services/telecomService";
import { bdErr, opColor } from "../services/bdService";

type RechargeRow = TelRecharge & { rtype?: string };

interface Props {
  bal: number;
  settings: TelSettings | null;
  enabled: boolean;
  packs: TelPack[];
  recharges: TelRecharge[];
  pinSet: boolean | null;
  startTab?: "topup" | "drive";
  onChanged: () => void | Promise<void>;
  onToast: (m: string, t?: "success" | "error") => void;
  onNeedPin: () => void;
  onReceipt: (o: TelRecharge) => void;
}

const CHIPS = ["20", "30", "50", "80", "100", "500"];

function StatusPill({ s }: { s: string }) {
  const color = s === "Completed" ? "text-teal-dark bg-teal-tint" : s === "Pending" || s === "Processing" ? "text-orange bg-orange-tint" : "text-red-600 bg-red-50";
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>{s}</span>;
}

function OpDot({ op, size = 36 }: { op: string; size?: number }) {
  return (
    <span className="rounded-full flex items-center justify-center text-white font-extrabold shrink-0" style={{ width: size, height: size, background: opColor(op), fontSize: size * 0.42 }}>
      {op.slice(0, 1)}
    </span>
  );
}

/** চেপে ধরে রাখলে সম্পন্ন হয় */
function HoldButton({ label, disabled, onDone }: { label: string; disabled: boolean; onDone: () => void }) {
  const [p, setP] = useState(0);
  const raf = useRef(0);
  const t0 = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  function stop() {
    cancelAnimationFrame(raf.current);
    setP(0);
  }
  function tick() {
    const v = Math.min(1, (performance.now() - t0.current) / 900);
    setP(v);
    if (v >= 1) {
      setP(0);
      onDone();
    } else raf.current = requestAnimationFrame(tick);
  }
  function start() {
    if (disabled) return;
    t0.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => e.key === "Enter" && !disabled && onDone()}
      style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
      className="relative w-full overflow-hidden rounded-2xl bg-[#2b4797] text-white font-extrabold text-sm py-4 disabled:opacity-50"
    >
      <span className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${p * 100}%` }} />
      <span className="relative">{label}</span>
    </button>
  );
}

export default function BdTopup({ bal, settings, enabled, packs, recharges, pinSet, startTab, onChanged, onToast, onNeedPin, onReceipt }: Props) {
  const [tab, setTab] = useState<"topup" | "drive">(startTab ?? "topup");
  const [num, setNum] = useState("");
  const [op, setOp] = useState<string>(OPERATORS[0]);
  const [opManual, setOpManual] = useState(false);
  const [opOpen, setOpOpen] = useState(false);
  const [rtype, setRtype] = useState<"Prepaid" | "Postpaid">("Prepaid");
  const [amt, setAmt] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [cat, setCat] = useState("all");
  const [days, setDays] = useState<number | "all">("all");
  const [sort, setSort] = useState<"none" | "asc" | "desc">("none");
  const [pick, setPick] = useState<TelPack | null>(null);

  const comm = Number(settings?.commission_pct ?? 0);
  const flat = Number(settings?.flat_charge ?? 0);
  const costOf = (base: number) => Math.round(base * (1 - comm / 100)) + flat;

  useEffect(() => {
    if (opManual) return;
    const d = detectOperator(num);
    if (d) setOp(d);
  }, [num, opManual]);

  const numOk = /^01[3-9][0-9]{8}$/.test(num);
  const amtMinor = toMinor(amt);
  const topupCost = amtMinor > 0 ? costOf(amtMinor) : 0;

  const opPacks = useMemo(() => packs.filter((p) => (!p.operator || p.operator === op) && p.price_bdt > 0), [packs, op]);
  const cats = useMemo(() => Array.from(new Set(opPacks.map((p) => p.category || "Other"))), [opPacks]);
  const catPacks = useMemo(() => opPacks.filter((p) => cat === "all" || (p.category || "Other") === cat), [opPacks, cat]);
  const dayList = useMemo(() => Array.from(new Set(catPacks.map((p) => p.validity_days).filter((x): x is number => !!x))).sort((a, b) => b - a), [catPacks]);
  const shown = useMemo(() => {
    let l = catPacks.filter((p) => days === "all" || p.validity_days === days);
    if (sort !== "none") l = [...l].sort((a, b) => (sort === "asc" ? a.price_bdt - b.price_bdt : b.price_bdt - a.price_bdt));
    return l;
  }, [catPacks, days, sort]);

  function guard(): boolean {
    if (pinSet === false) {
      onToast("আগে একটি পিন সেট করুন", "error");
      onNeedPin();
      return false;
    }
    if (!numOk) {
      onToast("সঠিক ১১ সংখ্যার নম্বর দিন", "error");
      return false;
    }
    if (pin.length < 4) {
      onToast("পিন দিন", "error");
      return false;
    }
    return true;
  }

  async function submitTopup() {
    if (!guard()) return;
    if (amtMinor < 1000) return onToast("কমপক্ষে ৳10 দিন", "error");
    if (topupCost > bal) return onToast("ওয়ালেটে পর্যাপ্ত BDT ব্যালেন্স নেই", "error");
    setBusy(true);
    try {
      await telRpcPin("telecom_request_topup", { p_operator: op, p_number: num, p_type: rtype, p_amount: amtMinor, p_currency: "BDT", p_pin: pin });
      onToast("রিচার্জ অর্ডার তৈরি হয়েছে। অ্যাডমিন প্রসেস করবে।", "success");
      setNum("");
      setAmt("");
      setPin("");
      setOpManual(false);
      await onChanged();
    } catch (e) {
      onToast(bdErr(e), "error");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  async function submitPack() {
    if (!pick || !guard()) return;
    if (costOf(pick.price_bdt) > bal) return onToast("ওয়ালেটে পর্যাপ্ত BDT ব্যালেন্স নেই", "error");
    setBusy(true);
    try {
      await telRpcPin("telecom_request_recharge_pin", { p_operator: op, p_number: num, p_pack: pick.id, p_currency: "BDT", p_pin: pin });
      onToast("প্যাকেজ অর্ডার তৈরি হয়েছে। অ্যাডমিন প্রসেস করবে।", "success");
      setPick(null);
      setPin("");
      setNum("");
      setOpManual(false);
      await onChanged();
    } catch (e) {
      onToast(bdErr(e), "error");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  const card = "bg-white border border-border rounded-2xl p-4 mb-3";

  if (!enabled) return <div className={card + " text-xs text-mute"}>বাংলাদেশ রিচার্জ এখন বন্ধ আছে।</div>;

  return (
    <>
      <div className="grid grid-cols-2 gap-1 bg-teal-tint p-1 rounded-xl mb-3">
        {(
          [
            ["topup", "📱 Mobile Recharge"],
            ["drive", "🌐 Drive Offer"]
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`press text-xs font-bold py-2 rounded-lg ${tab === k ? "bg-white text-teal-dark shadow" : "text-teal-dark/60"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className={card}>
        <label className="text-xs font-bold text-mute block mb-1">Phone number</label>
        <div className="relative">
          <div className="flex items-center border border-border rounded-xl bg-white overflow-hidden">
            <button type="button" className="press flex items-center gap-1 pl-3 pr-2 py-2.5 border-r border-border" onClick={() => setOpOpen(!opOpen)} aria-label="অপারেটর">
              <OpDot op={op} size={28} />
              <ChevronDown size={14} className="text-mute" />
            </button>
            <input
              className="flex-1 px-3 py-3 text-base outline-none bg-transparent"
              inputMode="numeric"
              maxLength={11}
              placeholder="Enter phone number (11 digits)"
              value={num}
              onChange={(e) => {
                setNum(e.target.value.replace(/\D/g, ""));
                setCat("all");
                setDays("all");
                setPick(null);
              }}
            />
          </div>
          {opOpen && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden">
              {OPERATORS.map((o) => (
                <button
                  key={o}
                  className={`press w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold border-b border-border last:border-0 ${o === op ? "bg-teal-tint" : ""}`}
                  onClick={() => {
                    setOp(o);
                    setOpManual(true);
                    setOpOpen(false);
                    setCat("all");
                    setDays("all");
                    setPick(null);
                  }}
                >
                  <OpDot op={o} />
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="text-[11px] text-mute mt-1.5">অপারেটর: <b className="text-ink">{op}</b> (নম্বর দিলে নিজে থেকে ধরে নেয়, ভুল হলে বদলান)</div>
      </div>

      {tab === "topup" && (
        <>
          <div className={card}>
            <label className="text-xs font-bold text-mute block mb-1">Select Type</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(["Prepaid", "Postpaid"] as const).map((t) => (
                <button key={t} onClick={() => setRtype(t)} className={`press rounded-xl py-3 text-sm font-bold border-2 ${rtype === t ? "bg-[#2b4797] text-white border-[#2b4797]" : "border-[#2b4797] text-[#2b4797] bg-white"}`}>
                  {t}
                </button>
              ))}
            </div>
            <label className="text-xs font-bold text-mute block mb-1">Amount</label>
            <input className="input mb-1 text-lg" type="number" inputMode="decimal" placeholder="৳ 0.00" value={amt} onChange={(e) => setAmt(e.target.value)} />
            <div className="text-xs mb-2">
              Available Balance: <b>{money("BDT", bal)}</b>
              {topupCost > 0 && (
                <>
                  {" "}· আপনার খরচ: <b>{money("BDT", topupCost)}</b>
                </>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
              {CHIPS.map((c) => (
                <button key={c} onClick={() => setAmt(c)} className={`press shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold border ${amt === c ? "bg-teal-tint border-teal text-teal-dark" : "bg-white border-border"}`}>
                  ৳{c}
                </button>
              ))}
            </div>
            <label className="text-xs font-bold text-mute block mb-1">Enter Pin</label>
            <input className="input mb-3" type="password" inputMode="numeric" maxLength={6} placeholder="Enter Pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            <HoldButton label={busy ? "অপেক্ষা করুন…" : "Tap and hold to Recharge"} disabled={busy} onDone={submitTopup} />
            <div className="text-[11px] text-mute mt-2">⚠ চেপে ধরে রাখলে অর্ডার হবে। অ্যাডমিন ম্যানুয়ালি রিচার্জ করবে; ব্যর্থ হলে টাকা ফেরত যাবে।</div>
          </div>
        </>
      )}

      {tab === "drive" && (
        <>
          {!numOk ? (
            <div className="text-xs text-mute text-center py-4">সঠিক ১১ সংখ্যার নম্বর দিলে {op} এর ড্রাইভ/ইন্টারনেট প্যাকেজ দেখাবে।</div>
          ) : (
            <>
              <div className="bg-orange-tint rounded-xl p-2.5 text-[11px] text-ink mb-3">⚠ কোনো প্যাকেজ এই নম্বরের সিমে না-ও থাকতে পারে। না থাকলে অর্ডার ব্যর্থ হবে ও টাকা ফেরত যাবে।</div>
              {cats.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[{ k: "all", label: "সব", icon: "🔥" }, ...cats.map((c) => PACK_CATEGORIES.find((x) => x.k === c) ?? { k: c, label: c, icon: "📦" })].map((c) => (
                    <button
                      key={c.k}
                      onClick={() => {
                        setCat(c.k);
                        setDays("all");
                      }}
                      className={`press rounded-2xl py-2.5 flex flex-col items-center gap-1 border ${cat === c.k ? "bg-ink text-white border-ink" : "bg-white border-border text-ink"}`}
                    >
                      <span className="text-xl">{c.icon}</span>
                      <span className="text-[11px] font-bold">{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <button className="press shrink-0 flex items-center gap-1 border border-border rounded-full px-3 py-1.5 text-xs font-bold" onClick={() => setSort(sort === "none" ? "asc" : sort === "asc" ? "desc" : "none")}>
                  <ArrowUpDown size={13} /> দাম {sort === "asc" ? "↑" : sort === "desc" ? "↓" : ""}
                </button>
                <div className="flex gap-1.5 overflow-x-auto">
                  {(["all", ...dayList] as (number | "all")[]).map((d) => (
                    <button key={String(d)} onClick={() => setDays(d)} className={`press shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${days === d ? "bg-green-600 text-white" : "bg-teal-tint text-teal-dark"}`}>
                      {d === "all" ? "সব" : `${d} Days`}
                    </button>
                  ))}
                </div>
              </div>
              {shown.length === 0 && <div className="text-xs text-mute text-center py-6">এই অপারেটরের জন্য এখনো প্যাকেজ যোগ করা হয়নি</div>}
              {shown.map((p) => (
                <button key={p.id} onClick={() => setPick(p)} className={`press w-full text-left bg-white border rounded-2xl p-3.5 mb-2.5 ${pick?.id === p.id ? "border-teal border-2" : "border-border"}`}>
                  <div className="flex items-center justify-between gap-2">
                    {p.tag ? <span className="text-[11px] font-bold bg-teal-tint text-teal-dark rounded-full px-2.5 py-1">{p.tag}</span> : <span />}
                    {p.validity_days ? <span className="text-[11px] font-bold text-mute">🗓 {p.validity_days} DAYS</span> : null}
                  </div>
                  <div className="flex items-end justify-between mt-2 gap-2">
                    <div className="font-extrabold text-base leading-snug">{p.name}</div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-base">{money("BDT", p.price_bdt)}</div>
                      <div className="text-[10px] text-mute">আপনার খরচ {money("BDT", costOf(p.price_bdt))}</div>
                    </div>
                  </div>
                </button>
              ))}
              {pick && (
                <div className={card}>
                  <div className="text-xs mb-2">
                    <b>{op}</b> · {num}
                    <br />
                    {pick.name} · খরচ <b>{money("BDT", costOf(pick.price_bdt))}</b> (ব্যালেন্স {money("BDT", bal)})
                  </div>
                  <input className="input mb-3" type="password" inputMode="numeric" maxLength={6} placeholder="Enter Pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
                  <HoldButton label={busy ? "অপেক্ষা করুন…" : "Tap and hold to Order"} disabled={busy} onDone={submitPack} />
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className={card}>
        <div className="font-extrabold text-sm mb-2">রিচার্জ অর্ডার</div>
        {recharges.length === 0 ? (
          <div className="text-xs text-mute">নেই</div>
        ) : (
          recharges.map((o) => {
            const r = o as RechargeRow;
            return (
              <div key={o.id} className="py-2 border-b border-border last:border-0 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    R{o.id} · {o.operator} {o.number}
                    <br />
                    <span className="text-mute">
                      {o.pack_name}
                      {r.rtype && o.pack_name.indexOf("Top-up") < 0 ? ` · ${r.rtype}` : ""} · {money(o.currency, o.amount)} · {fmtDate(o.created_at)}
                    </span>
                  </span>
                  <StatusPill s={o.status} />
                </div>
                {o.fulfil_ref && <div className="text-mute mt-1">রেফ: {o.fulfil_ref}</div>}
                {o.refunded && <div className="text-mute mt-1">টাকা ফেরত হয়েছে</div>}
                <button className="press text-teal-dark font-bold mt-1.5" onClick={() => onReceipt(o)}>
                  রসিদ দেখুন / শেয়ার
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
