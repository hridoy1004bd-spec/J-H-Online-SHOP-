import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Crown } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { tk } from "../../services/dropshipService";
import {
  PersonRef,
  SubKind,
  SubPayment,
  SubPlan,
  SubSetting,
  Subscription,
  daysLeft,
  fmtDate,
  loadPeople,
  platErr,
  rpc
} from "../../services/platformService";

const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnRed = "press bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const lbl = "block text-[11px] font-bold text-mute mb-1";

const KIND_LABEL: Record<SubKind, string> = { dropship: "ড্রপশিপিং", telecom: "J H Telecom" };
const STATUS_BN: Record<string, string> = { active: "সক্রিয়", suspended: "স্থগিত", expired: "মেয়াদ শেষ", cancelled: "বাতিল" };
const STATUS_CLS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  cancelled: "bg-gray-100 text-gray-600"
};

interface PlanForm {
  price: string;
  features: string;
  active: boolean;
}

export default function AdminSubscriptions() {
  const { showToast } = useToast();
  const [kind, setKind] = useState<SubKind>("dropship");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<SubSetting[]>([]);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [pays, setPays] = useState<SubPayment[]>([]);
  const [people, setPeople] = useState<PersonRef[]>([]);
  const [planForm, setPlanForm] = useState<Record<string, PlanForm>>({});
  const [confirmOn, setConfirmOn] = useState(false);
  const [aUser, setAUser] = useState("");
  const [aPlan, setAPlan] = useState("Basic");
  const [aDays, setADays] = useState("30");
  const [aFree, setAFree] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [pAmt, setPAmt] = useState("");
  const [pMethod, setPMethod] = useState("bKash");
  const [pRef, setPRef] = useState("");
  const [pDays, setPDays] = useState("30");

  const enabled = settings.find((s) => s.kind === kind)?.enabled ?? false;
  const kPlans = useMemo(() => plans.filter((p) => p.kind === kind), [plans, kind]);
  const kSubs = useMemo(() => subs.filter((s) => s.kind === kind), [subs, kind]);
  const kPays = useMemo(() => pays.filter((p) => p.kind === kind), [pays, kind]);
  const nameOf = (uid: string) => people.find((p) => p.user_id === uid)?.name ?? uid.slice(0, 8);
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "-";

  const load = useCallback(async () => {
    const [st, pl, sb, py, pe] = await Promise.all([
      supabase.from("sub_settings").select("kind,enabled"),
      supabase.from("sub_plans").select("*").order("price"),
      supabase.from("subscriptions").select("*").order("expires_at"),
      supabase.from("sub_payments").select("*").order("created_at", { ascending: false }).limit(200),
      loadPeople(kind)
    ]);
    setSettings((st.data ?? []) as SubSetting[]);
    const pls = (pl.data ?? []) as SubPlan[];
    setPlans(pls);
    setSubs((sb.data ?? []) as Subscription[]);
    setPays((py.data ?? []) as SubPayment[]);
    setPeople(pe);
    const f: Record<string, PlanForm> = {};
    pls.forEach((p) => {
      f[p.id] = { price: String(p.price), features: (p.features ?? []).join("\n"), active: p.active };
    });
    setPlanForm(f);
  }, [kind]);

  useEffect(() => {
    load().catch((e) => showToast(platErr(e), "error"));
    setConfirmOn(false);
    setPayFor(null);
    setAUser("");
  }, [load, showToast]);

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    try {
      await fn();
      showToast(okMsg, "success");
      await load();
    } catch (e) {
      showToast(platErr(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const expiring = kSubs.filter((s) => s.status === "active" && daysLeft(s.expires_at) <= 7);

  return (
    <div>
      <h1 className="text-lg font-extrabold text-ink mb-3 flex items-center gap-2">
        <Crown size={20} /> সাবস্ক্রিপশন
      </h1>
      <div className="flex gap-2 mb-3">
        {(["dropship", "telecom"] as SubKind[]).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={k === kind ? btn : btnGhost}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-extrabold text-ink">{KIND_LABEL[kind]} সাবস্ক্রিপশন</div>
            <div className="text-xs text-mute">
              {enabled
                ? "চালু আছে। প্ল্যান ও মেয়াদ প্রযোজ্য।"
                : "বন্ধ আছে। কারও কাছ থেকে কোনো চার্জ নেওয়া হচ্ছে না, কোনো ফিচারও আটকানো নেই।"}
            </div>
          </div>
          <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            {enabled ? "চালু" : "বন্ধ"}
          </span>
        </div>
        {!confirmOn ? (
          <button className={`${enabled ? btnRed : btn} mt-3`} disabled={busy} onClick={() => setConfirmOn(true)}>
            {enabled ? "বন্ধ করুন" : "চালু করুন"}
          </button>
        ) : (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            {enabled
              ? "বন্ধ করলে নতুন সাবস্ক্রিপশন আর প্রযোজ্য হবে না। বিদ্যমান তথ্য মুছবে না।"
              : "চালু করলে এই সিস্টেমের প্ল্যান ও মেয়াদ কার্যকর হবে। পেমেন্ট আপনি নিজে নথিভুক্ত করবেন, ওয়ালেট থেকে কিছু কাটা হয় না।"}
            <div className="flex gap-2 mt-2">
              <button
                className={btn}
                disabled={busy}
                onClick={() =>
                  run(() => rpc("sub_admin_set_enabled", { p_kind: kind, p_enabled: !enabled }), enabled ? "বন্ধ করা হয়েছে" : "চালু করা হয়েছে").then(() =>
                    setConfirmOn(false)
                  )
                }
              >
                নিশ্চিত
              </button>
              <button className={btnGhost} onClick={() => setConfirmOn(false)}>
                বাতিল
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {kPlans.map((p) => {
          const f = planForm[p.id] ?? { price: "0", features: "", active: true };
          return (
            <div key={p.id} className={card}>
              <div className="font-extrabold text-ink mb-2">{p.name}</div>
              <label className={lbl}>মাসিক দাম (৳)</label>
              <input
                className="input mb-2"
                type="number"
                min="0"
                value={f.price}
                onChange={(e) => setPlanForm({ ...planForm, [p.id]: { ...f, price: e.target.value } })}
              />
              <label className={lbl}>ফিচার (প্রতি লাইনে একটি)</label>
              <textarea
                className="input mb-2"
                rows={4}
                value={f.features}
                onChange={(e) => setPlanForm({ ...planForm, [p.id]: { ...f, features: e.target.value } })}
              />
              <label className="flex items-center gap-2 text-xs mb-2">
                <input
                  type="checkbox"
                  checked={f.active}
                  onChange={(e) => setPlanForm({ ...planForm, [p.id]: { ...f, active: e.target.checked } })}
                />
                প্ল্যান চালু
              </label>
              <button
                className={btn}
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      rpc("sub_admin_save_plan", {
                        p_kind: kind,
                        p_name: p.name,
                        p_price: Number(f.price || 0),
                        p_features: f.features.split("\n").map((x) => x.trim()).filter(Boolean),
                        p_active: f.active
                      }),
                    `${p.name} সংরক্ষিত`
                  )
                }
              >
                সংরক্ষণ
              </button>
            </div>
          );
        })}
      </div>

      <div className={card}>
        <div className="font-extrabold text-ink mb-2">সাবস্ক্রিপশন দিন / ফ্রি বরাদ্দ</div>
        <div className="grid gap-2 md:grid-cols-4">
          <div>
            <label className={lbl}>ব্যবহারকারী</label>
            <select className="input" value={aUser} onChange={(e) => setAUser(e.target.value)}>
              <option value="">বেছে নিন</option>
              {people.filter((p) => p.user_id).map((p) => (
                <option key={p.id} value={p.user_id as string}>
                  {p.name} {p.mobile ? `(${p.mobile})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>প্ল্যান</label>
            <select className="input" value={aPlan} onChange={(e) => setAPlan(e.target.value)}>
              {["Basic", "Premium", "VIP"].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>দিন</label>
            <input className="input" type="number" min="1" value={aDays} onChange={(e) => setADays(e.target.value)} />
          </div>
          <label className="flex items-end gap-2 text-xs pb-2">
            <input type="checkbox" checked={aFree} onChange={(e) => setAFree(e.target.checked)} />
            ফ্রি বরাদ্দ
          </label>
        </div>
        <button
          className={`${btn} mt-2`}
          disabled={busy || !aUser}
          onClick={() =>
            run(() => rpc("sub_admin_assign", { p_kind: kind, p_user: aUser, p_plan: aPlan, p_days: Number(aDays), p_free: aFree }), "বরাদ্দ হয়েছে")
          }
        >
          বরাদ্দ করুন
        </button>
      </div>

      <div className={card}>
        <div className="font-extrabold text-ink mb-2">গ্রাহক তালিকা ({kSubs.length})</div>
        {expiring.length > 0 && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 mb-2">
            ৭ দিনের মধ্যে মেয়াদ শেষ: {expiring.map((s) => nameOf(s.user_id)).join(", ")}. রিনিউয়াল নোটিফিকেশন পাঠানোর ব্যবস্থা পরের ধাপে আসবে।
          </div>
        )}
        {kSubs.length === 0 && <div className="text-xs text-mute">এখনো কেউ নেই।</div>}
        {kSubs.map((s) => (
          <div key={s.id} className="border-t border-border py-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm">
                <b>{nameOf(s.user_id)}</b> · {planName(s.plan_id)} {s.is_free && <span className="text-[11px] text-mute">(ফ্রি)</span>}
                <div className="text-[11px] text-mute">
                  মেয়াদ: {fmtDate(s.expires_at)} ({daysLeft(s.expires_at)} দিন)
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[s.status]}`}>{STATUS_BN[s.status]}</span>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button className={btnGhost} disabled={busy} onClick={() => run(() => rpc("sub_admin_extend", { p_id: s.id, p_days: 30 }), "৩০ দিন বাড়ানো হয়েছে")}>
                +৩০ দিন
              </button>
              <button
                className={s.status === "suspended" ? btn : btnRed}
                disabled={busy}
                onClick={() => run(() => rpc("sub_admin_set_status", { p_id: s.id, p_status: s.status === "suspended" ? "active" : "suspended" }), "স্ট্যাটাস বদলেছে")}
              >
                {s.status === "suspended" ? "চালু করুন" : "স্থগিত করুন"}
              </button>
              <button className={btnGhost} onClick={() => setPayFor(payFor === s.id ? null : s.id)}>
                পেমেন্ট নথিভুক্ত
              </button>
            </div>
            {payFor === s.id && (
              <div className="grid gap-2 md:grid-cols-5 mt-2">
                <input className="input" type="number" min="0" placeholder="৳ পরিমাণ" value={pAmt} onChange={(e) => setPAmt(e.target.value)} />
                <select className="input" value={pMethod} onChange={(e) => setPMethod(e.target.value)}>
                  {["bKash", "Nagad", "Rocket", "ক্যাশ", "ব্যাংক"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <input className="input" placeholder="ট্রানজ্যাকশন আইডি" value={pRef} onChange={(e) => setPRef(e.target.value)} />
                <input className="input" type="number" min="0" placeholder="দিন বাড়বে" value={pDays} onChange={(e) => setPDays(e.target.value)} />
                <button
                  className={btn}
                  disabled={busy || !pAmt}
                  onClick={() =>
                    run(
                      () => rpc("sub_admin_record_payment", { p_sub: s.id, p_amount: Number(pAmt), p_method: pMethod, p_reference: pRef, p_note: null, p_days: Number(pDays || 0) }),
                      "পেমেন্ট নথিভুক্ত হয়েছে"
                    ).then(() => {
                      setPAmt("");
                      setPRef("");
                      setPayFor(null);
                    })
                  }
                >
                  সংরক্ষণ
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={card}>
        <div className="font-extrabold text-ink mb-2">পেমেন্ট ইতিহাস</div>
        {kPays.length === 0 && <div className="text-xs text-mute">কোনো পেমেন্ট নেই।</div>}
        {kPays.map((p) => (
          <div key={p.id} className="flex justify-between text-xs border-t border-border py-1.5">
            <span>
              {nameOf(p.user_id)} · {p.method ?? "-"} {p.reference ? `· ${p.reference}` : ""}
            </span>
            <span>
              <b>{tk(p.amount)}</b> · {fmtDate(p.created_at)}
            </span>
          </div>
        ))}
        <p className="text-[11px] text-mute mt-2">সাবস্ক্রিপশনের টাকা ব্যবসার ওয়ালেট বা লেজারে যায় না, আলাদা রেকর্ড।</p>
      </div>
    </div>
  );
}
