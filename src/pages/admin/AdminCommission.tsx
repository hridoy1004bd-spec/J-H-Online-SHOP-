import React, { useCallback, useEffect, useState } from "react";
import { Percent } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { CommissionOverride, CommissionRate, DsTier, PersonRef, loadPeople, platErr, rpc } from "../../services/platformService";

type Tab = "r" | "o" | "t";
const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnRed = "press bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const lbl = "block text-[11px] font-bold text-mute mb-1";

export default function AdminCommission() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("r");
  const [busy, setBusy] = useState(false);
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [rateIn, setRateIn] = useState<Record<string, string>>({});
  const [overs, setOvers] = useState<CommissionOverride[]>([]);
  const [resellers, setResellers] = useState<PersonRef[]>([]);
  const [split, setSplit] = useState("50");
  const [tiers, setTiers] = useState<DsTier[]>([]);
  const [tierIn, setTierIn] = useState<Record<string, string>>({});
  const [oRes, setORes] = useState("");
  const [oSvc, setOSvc] = useState("");
  const [oPct, setOPct] = useState("");

  const load = useCallback(async () => {
    const [r, o, c, t, rs] = await Promise.all([
      supabase.from("commission_rates").select("*").order("sort"),
      supabase.from("commission_overrides").select("*"),
      supabase.from("commission_config").select("coupon_customer_share").eq("id", 1).maybeSingle(),
      supabase.from("ds_tiers").select("*"),
      loadPeople("telecom")
    ]);
    const rr = (r.data ?? []) as CommissionRate[];
    setRates(rr);
    setRateIn(Object.fromEntries(rr.map((x) => [x.service_key, String(x.pct)])));
    setOvers((o.data ?? []) as CommissionOverride[]);
    if (c.data) setSplit(String((c.data as { coupon_customer_share: number }).coupon_customer_share));
    const tt = ((t.data ?? []) as DsTier[]).sort((a, b) => ["Basic", "Premium", "VIP"].indexOf(a.tier) - ["Basic", "Premium", "VIP"].indexOf(b.tier));
    setTiers(tt);
    setTierIn(Object.fromEntries(tt.map((x) => [x.tier, String(x.discount_pct)])));
    setResellers(rs);
    setOSvc((cur) => cur || rr[0]?.service_key || "");
  }, []);

  useEffect(() => {
    load().catch((e) => showToast(platErr(e), "error"));
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

  const resName = (id: string) => resellers.find((r) => r.id === id)?.name ?? id.slice(0, 6);
  const svcName = (k: string) => rates.find((r) => r.service_key === k)?.label ?? k;

  return (
    <div>
      <h1 className="text-lg font-extrabold text-ink mb-3 flex items-center gap-2">
        <Percent size={20} /> কমিশন ও স্তর
      </h1>
      <div className="flex gap-2 mb-3 flex-wrap">
        {([["r", "কমিশন হার"], ["o", "আলাদা হার"], ["t", "ড্রপশিপার স্তর"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={k === tab ? btn : btnGhost}>
            {l}
          </button>
        ))}
      </div>

      {tab === "r" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-ink mb-1">রিসেলারের কমিশন (%)</div>
            <p className="text-[11px] text-mute mb-2">০ মানে এখনো হার ঠিক করা হয়নি। দাম গ্রাহক ও রিসেলারের সমান, রিসেলার শুধু কমিশন পায়।</p>
            {rates.map((r) => (
              <div key={r.service_key} className="flex items-center gap-2 border-t border-border py-2">
                <div className="flex-1 text-sm">{r.label}</div>
                <input
                  className="input w-24"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={rateIn[r.service_key] ?? ""}
                  onChange={(e) => setRateIn({ ...rateIn, [r.service_key]: e.target.value })}
                />
                <button
                  className={btn}
                  disabled={busy}
                  onClick={() => run(() => rpc("commission_admin_save", { p_key: r.service_key, p_label: r.label, p_pct: Number(rateIn[r.service_key] || 0) }), `${r.label} সংরক্ষিত`)}
                >
                  সেভ
                </button>
              </div>
            ))}
          </div>
          <div className={card}>
            <div className="font-extrabold text-ink mb-1">রিসেলারের কুপনে ভাগ</div>
            <p className="text-[11px] text-mute mb-2">রিসেলারের কুপনে হওয়া কমিশনের কত শতাংশ গ্রাহক ছাড় পাবে। বাকিটা রিসেলার পাবে। ড্রপশিপারের কুপনে কোনো কমিশন নেই।</p>
            <div className="flex items-center gap-2">
              <input className="input w-24" type="number" min="0" max="100" value={split} onChange={(e) => setSplit(e.target.value)} />
              <span className="text-xs text-mute">গ্রাহক {split || 0}% · রিসেলার {100 - Number(split || 0)}%</span>
              <button className={btn} disabled={busy} onClick={() => run(() => rpc("commission_admin_set_split", { p_customer_share: Number(split || 0) }), "ভাগ সংরক্ষিত")}>
                সেভ
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "o" && (
        <div className={card}>
          <div className="font-extrabold text-ink mb-2">নির্দিষ্ট রিসেলারের আলাদা হার</div>
          <div className="grid gap-2 md:grid-cols-4 mb-2">
            <div>
              <label className={lbl}>রিসেলার</label>
              <select className="input" value={oRes} onChange={(e) => setORes(e.target.value)}>
                <option value="">বেছে নিন</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>সার্ভিস</label>
              <select className="input" value={oSvc} onChange={(e) => setOSvc(e.target.value)}>
                {rates.map((r) => (
                  <option key={r.service_key} value={r.service_key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>হার %</label>
              <input className="input" type="number" min="0" max="100" step="0.1" value={oPct} onChange={(e) => setOPct(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button
                className={btn}
                disabled={busy || !oRes || oPct === ""}
                onClick={() => run(() => rpc("commission_admin_override", { p_reseller: oRes, p_key: oSvc, p_pct: Number(oPct) }), "আলাদা হার সংরক্ষিত").then(() => setOPct(""))}
              >
                যোগ করুন
              </button>
            </div>
          </div>
          {overs.length === 0 && <div className="text-xs text-mute">কোনো আলাদা হার নেই।</div>}
          {overs.map((o) => (
            <div key={o.reseller_id + o.service_key} className="flex items-center justify-between border-t border-border py-2 text-sm">
              <span>
                {resName(o.reseller_id)} · {svcName(o.service_key)} · <b>{o.pct}%</b>
              </span>
              <button className={btnRed} disabled={busy} onClick={() => run(() => rpc("commission_admin_override", { p_reseller: o.reseller_id, p_key: o.service_key, p_pct: null }), "মুছে ফেলা হয়েছে")}>
                মুছুন
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "t" && (
        <div className={card}>
          <div className="font-extrabold text-ink mb-1">ড্রপশিপার পাইকারি দামের ছাড় (স্তর অনুযায়ী)</div>
          <p className="text-[11px] text-mute mb-2">
            শুরুতে সব ০%, তাই সবার দাম সমান। স্তর ড্রপশিপিং সাবস্ক্রিপশন প্ল্যানের সাথে যুক্ত, সাবস্ক্রিপশন বন্ধ থাকলে সবাই Basic। এই ছাড় পাইকারি দামে প্রয়োগের কোড পরের ধাপে যোগ হবে, এখন শুধু হার সংরক্ষিত হয়।
          </p>
          {tiers.map((t) => (
            <div key={t.tier} className="flex items-center gap-2 border-t border-border py-2">
              <div className="flex-1 text-sm font-bold">{t.tier}</div>
              <input
                className="input w-24"
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={tierIn[t.tier] ?? ""}
                onChange={(e) => setTierIn({ ...tierIn, [t.tier]: e.target.value })}
              />
              <span className="text-xs text-mute">%</span>
              <button className={btn} disabled={busy} onClick={() => run(() => rpc("ds_admin_save_tier", { p_tier: t.tier, p_discount: Number(tierIn[t.tier] || 0) }), `${t.tier} সংরক্ষিত`)}>
                সেভ
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
