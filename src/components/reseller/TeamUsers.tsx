import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { fmtDate, money, telRpc, telRpcPin, toMinor } from "../../services/telecomService";
import { MyRate, PERM_LIST, TeamUser, accountInvoke, svcErr } from "../../services/resellerService";

const BLUE = "#2b4797";
const card = "bg-white border border-border rounded-2xl p-4 mb-3";

interface CommonProps {
  pinSet: boolean | null;
  ownPerm: Record<string, boolean> | undefined;
  onChanged: () => void | Promise<void>;
  onToast: (m: string, t?: "success" | "error") => void;
  onNeedPin: () => void;
}

function ownHas(perm: Record<string, boolean> | undefined, k: string) {
  const v = perm?.[k];
  return v === undefined ? k === "Cards" || k === "Requests" : Boolean(v);
}

function useRates() {
  const [rates, setRates] = useState<MyRate[]>([]);
  useEffect(() => {
    supabase.rpc("tel_my_rates").then(({ data }) => setRates(((data ?? []) as MyRate[]).map((r) => ({ ...r, pct: Number(r.pct) }))));
  }, []);
  return rates;
}

function RateInputs({ rates, vals, setVals }: { rates: MyRate[]; vals: Record<string, string>; setVals: (v: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {rates.map((r) => (
        <div key={r.service_key}>
          <label className="text-[11px] font-bold text-mute block mb-1">
            {r.label} <span className="font-normal">(সর্বোচ্চ {r.pct}%)</span>
          </label>
          <input className="input" inputMode="decimal" placeholder="Enter percentage" value={vals[r.service_key] ?? ""} onChange={(e) => setVals({ ...vals, [r.service_key]: e.target.value.replace(/[^0-9.]/g, "") })} />
        </div>
      ))}
    </div>
  );
}

function PermBoxes({ own, val, setVal }: { own: Record<string, boolean> | undefined; val: Record<string, boolean>; setVal: (v: Record<string, boolean>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PERM_LIST.filter((p) => ownHas(own, p.k)).map((p) => (
        <label key={p.k} className="flex items-center gap-2 text-[12px] font-semibold">
          <input type="checkbox" className="w-5 h-5" checked={Boolean(val[p.k])} onChange={(e) => setVal({ ...val, [p.k]: e.target.checked })} />
          {p.label}
        </label>
      ))}
    </div>
  );
}

function cleanRates(v: Record<string, string>): Record<string, number> {
  const o: Record<string, number> = {};
  Object.entries(v).forEach(([k, s]) => {
    if (s !== "" && !isNaN(Number(s))) o[k] = Number(s);
  });
  return o;
}

/** নতুন ইউজার (নিজের অধীনে সাব-রিসেলার) */
export function AddUser({ pinSet, ownPerm, onChanged, onToast, onNeedPin }: CommonProps) {
  const rates = useRates();
  const [f, setF] = useState({ name: "", mobile: "", password: "" });
  const [vals, setVals] = useState<Record<string, string>>({});
  const [perm, setPerm] = useState<Record<string, boolean>>(() => Object.fromEntries(PERM_LIST.map((p) => [p.k, ownHas(ownPerm, p.k)])));
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (pinSet === false) {
      onToast("আগে নিজের পিন সেট করুন", "error");
      return onNeedPin();
    }
    setBusy(true);
    try {
      await accountInvoke({ role: "sub_reseller", ...f, pin, perm, rates: cleanRates(vals) });
      onToast("ইউজার যোগ হয়েছে ✓", "success");
      setF({ name: "", mobile: "", password: "" });
      setVals({});
      setPin("");
      await onChanged();
    } catch (e) {
      onToast(svcErr(e), "error");
      setPin("");
    } finally {
      setBusy(false);
    }
  }
  const ok = f.name.trim().length >= 2 && /^01[3-9]\d{8}$/.test(f.mobile) && f.password.length >= 6 && pin.length >= 4;

  return (
    <div className={card}>
      <div className="font-extrabold text-sm mb-1">Add User</div>
      <div className="text-[11px] text-mute mb-3">নতুন ইউজার আপনার অধীনে থাকবে। তার কেনাকাটায় আপনার ও তার কমিশনের পার্থক্য আপনি পাবেন। কমিশন আপনার নিজের কমিশনের বেশি দেওয়া যাবে না।</div>
      <label className="text-xs font-bold text-mute block mb-1">নাম / দোকানের নাম</label>
      <input className="input mb-3" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <label className="text-xs font-bold text-mute block mb-1">মোবাইল নম্বর (সে এই নম্বর দিয়ে লগইন করবে)</label>
      <input className="input mb-3" inputMode="numeric" maxLength={11} placeholder="01XXXXXXXXX" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, "") })} />
      <label className="text-xs font-bold text-mute block mb-1">লগইন পাসওয়ার্ড (কমপক্ষে ৬)</label>
      <input className="input mb-4" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <div className="font-extrabold text-xs mb-2">কমিশন (%)</div>
      <RateInputs rates={rates} vals={vals} setVals={setVals} />
      <div className="font-extrabold text-xs mt-4 mb-2">Permission</div>
      <PermBoxes own={ownPerm} val={perm} setVal={setPerm} />
      <label className="text-xs font-bold text-mute block mb-1 mt-4">Your Pin Code</label>
      <input className="input mb-4" type="password" inputMode="numeric" maxLength={6} placeholder="Enter pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
      <button className="press w-full rounded-2xl text-white font-extrabold py-4 disabled:opacity-50" style={{ background: BLUE }} disabled={busy || !ok} onClick={go}>
        {busy ? "অপেক্ষা করুন…" : "Add user"}
      </button>
    </div>
  );
}

/** আমার ইউজার */
export function MyUsers({ pinSet, ownPerm, onChanged, onToast, onNeedPin }: CommonProps) {
  const rates = useRates();
  const [list, setList] = useState<TeamUser[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"tr" | "rt" | "pm">("tr");
  const [amt, setAmt] = useState("");
  const [pin, setPin] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [perm, setPerm] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("tel_my_users");
    setList(((data ?? []) as TeamUser[]).map((u) => ({ ...u, u_balance: Number(u.u_balance) })));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function openUser(u: TeamUser) {
    if (open === u.u_id) return setOpen(null);
    setOpen(u.u_id);
    setTab("tr");
    setAmt("");
    setPin("");
    setVals(Object.fromEntries(Object.entries(u.u_rates ?? {}).map(([k, v]) => [k, String(v)])));
    setPerm(Object.fromEntries(PERM_LIST.map((p) => [p.k, Boolean(u.u_perm?.[p.k] ?? (p.k === "Cards" || p.k === "Requests"))])));
  }

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      onToast(ok, "success");
      await Promise.all([load(), onChanged()]);
    } catch (e) {
      onToast(svcErr(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {list.length === 0 && <div className={card + " text-xs text-mute text-center"}>এখনো কোনো ইউজার নেই। "Add User" থেকে যোগ করুন।</div>}
      {list.map((u) => (
        <div key={u.u_id} className={card}>
          <button className="press w-full text-left" onClick={() => openUser(u)}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-extrabold text-sm truncate">{u.u_name}</div>
                <div className="text-[11px] text-mute">
                  {u.u_mobile} · {fmtDate(u.u_created)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-extrabold text-sm">{money("BDT", u.u_balance)}</div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.u_status === "Approved" ? "text-teal-dark bg-teal-tint" : "text-red-600 bg-red-50"}`}>{u.u_status === "Approved" ? "সক্রিয়" : "বন্ধ"}</span>
              </div>
            </div>
          </button>

          {open === u.u_id && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {([["tr", "ব্যালেন্স দিন"], ["rt", "কমিশন"], ["pm", "অনুমতি"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)} className={`press rounded-lg py-2 text-xs font-bold ${tab === k ? "text-white" : "bg-teal-tint text-teal-dark"}`} style={tab === k ? { background: BLUE } : undefined}>
                    {l}
                  </button>
                ))}
              </div>

              {tab === "tr" && (
                <>
                  <input className="input mb-2" type="number" inputMode="decimal" placeholder="কত টাকা পাঠাবেন" value={amt} onChange={(e) => setAmt(e.target.value)} />
                  <input className="input mb-2" type="password" inputMode="numeric" maxLength={6} placeholder="আপনার পিন" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
                  <button
                    className="press w-full rounded-xl text-white font-bold py-3 disabled:opacity-50"
                    style={{ background: BLUE }}
                    disabled={busy || toMinor(amt) < 1000 || pin.length < 4}
                    onClick={() => {
                      if (pinSet === false) {
                        onToast("আগে পিন সেট করুন", "error");
                        return onNeedPin();
                      }
                      run(async () => {
                        try {
                          await telRpcPin("tel_transfer", { p_user: u.u_id, p_amt: toMinor(amt), p_pin: pin });
                        } finally {
                          setPin("");
                        }
                        setAmt("");
                      }, "ব্যালেন্স পাঠানো হয়েছে ✓");
                    }}
                  >
                    ট্রান্সফার করুন
                  </button>
                  <div className="text-[11px] text-mute mt-2">আপনার BDT ব্যালেন্স থেকে কেটে তার ওয়ালেটে যাবে।</div>
                </>
              )}

              {tab === "rt" && (
                <>
                  <RateInputs rates={rates} vals={vals} setVals={setVals} />
                  <button className="press w-full rounded-xl text-white font-bold py-3 mt-3 disabled:opacity-50" style={{ background: BLUE }} disabled={busy} onClick={() => run(() => telRpc("tel_user_set_rates", { p_user: u.u_id, p_rates: cleanRates(vals) }), "কমিশন সেভ হয়েছে ✓")}>
                    কমিশন সেভ
                  </button>
                </>
              )}

              {tab === "pm" && (
                <>
                  <PermBoxes own={ownPerm} val={perm} setVal={setPerm} />
                  <button className="press w-full rounded-xl text-white font-bold py-3 mt-3 disabled:opacity-50" style={{ background: BLUE }} disabled={busy} onClick={() => run(() => telRpc("tel_user_set_perm", { p_user: u.u_id, p_perm: perm }), "অনুমতি সেভ হয়েছে ✓")}>
                    অনুমতি সেভ
                  </button>
                </>
              )}

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button className="press rounded-xl border border-border py-2.5 text-xs font-bold disabled:opacity-50" disabled={busy} onClick={() => run(() => telRpc("tel_user_set_status", { p_user: u.u_id, p_status: u.u_status === "Approved" ? "Suspended" : "Approved" }), u.u_status === "Approved" ? "বন্ধ করা হয়েছে" : "চালু করা হয়েছে")}>
                  {u.u_status === "Approved" ? "সাময়িক বন্ধ করুন" : "আবার চালু করুন"}
                </button>
                <button className="press rounded-xl border border-border py-2.5 text-xs font-bold disabled:opacity-50" disabled={busy} onClick={() => window.confirm("তার পিন মুছে ফেলবেন? সে লগইনের পর নতুন পিন সেট করবে।") && run(() => telRpc("tel_user_reset_pin", { p_user: u.u_id }), "পিন রিসেট হয়েছে")}>
                  পিন রিসেট
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/** আমার কমিশন হার */
export function MyRates() {
  const rates = useRates();
  return (
    <div className={card}>
      <div className="font-extrabold text-sm mb-1">আমার কমিশন</div>
      <div className="text-[11px] text-mute mb-3">কেনার সময় এই হার অনুযায়ী আগেই কম টাকা কাটা হয়। হার অ্যাডমিন ঠিক করেন।</div>
      {rates.map((r) => (
        <div key={r.service_key} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 text-sm">
          <span className="font-semibold">{r.label}</span>
          <span className="font-extrabold" style={{ color: BLUE }}>
            {r.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}
