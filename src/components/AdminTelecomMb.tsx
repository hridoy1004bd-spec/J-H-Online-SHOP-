import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { fmtDate, money, telRpc } from "../services/telecomService";
import { bdErr } from "../services/bdService";
import { MbOrder } from "./MobileBanking";
import { useToast } from "../contexts/ToastContext";

const btn = "press bg-teal text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnRed = "press bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";

function Pill({ s }: { s: string }) {
  const color = s === "Completed" ? "text-teal-dark bg-teal-tint" : s === "Pending" || s === "Processing" ? "text-orange bg-orange-tint" : "text-red-600 bg-red-50";
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>{s}</span>;
}

export default function AdminTelecomMb({ resellers }: { resellers: { id: string; name: string; mobile: string }[] }) {
  const { showToast } = useToast();
  const [list, setList] = useState<MbOrder[]>([]);
  const [refs, setRefs] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("telecom_mb_orders").select("*").order("id", { ascending: false }).limit(200);
    setList((data ?? []) as MbOrder[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function act(id: number, status: string, ref: string, ok: string) {
    setBusy(true);
    try {
      await telRpc("telecom_admin_update_mb", { p_id: id, p_status: status, p_ref: ref });
      showToast(ok, "success");
      await load();
    } catch (e) {
      showToast(bdErr(e), "error");
    } finally {
      setBusy(false);
    }
  }
  const nm = (id: string) => resellers.find((r) => r.id === id)?.name ?? id.slice(0, 6);

  return (
    <div className="bg-white border border-border rounded-2xl p-4 mb-3">
      <div className="font-extrabold text-sm mb-1">মোবাইল ব্যাংকিং অনুরোধ</div>
      <div className="text-[11px] text-mute mb-3">নম্বরে নিজে টাকা পাঠিয়ে ট্রানজেকশন রেফারেন্স দিয়ে "সম্পন্ন" করুন। ব্যর্থ করলে টাকা একবারই ফেরত যাবে।</div>
      {list.length === 0 && <div className="text-xs text-mute">নেই</div>}
      {list.map((o) => {
        const final = o.status === "Completed" || o.status === "Failed";
        return (
          <div key={o.id} className="py-2.5 border-b border-border last:border-0 text-xs">
            <div className="flex items-start justify-between gap-2">
              <span>
                M{o.id} · {nm(o.reseller_id)}
                <br />
                <b className="text-[13px]">
                  {o.method} ({o.acc_type}) {o.account}
                </b>
                <br />
                <span className="text-mute">
                  পাঠাতে হবে <b className="text-ink">{money("BDT", o.amount)}</b> · কাটা হয়েছে {money("BDT", o.cost)} · {fmtDate(o.created_at)}
                </span>
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
                <input className="input mb-2" placeholder="ট্রানজেকশন রেফারেন্স (সম্পন্ন করতে লাগবে)" value={refs[o.id] ?? ""} onChange={(e) => setRefs({ ...refs, [o.id]: e.target.value })} />
                <div className="flex gap-2">
                  <button className={btnGhost} disabled={busy} onClick={() => act(o.id, "Processing", "", "প্রসেসিং")}>
                    প্রসেসিং
                  </button>
                  <button className={btn} disabled={busy} onClick={() => act(o.id, "Completed", refs[o.id] ?? "", "সম্পন্ন")}>
                    সম্পন্ন
                  </button>
                  <button className={btnRed} disabled={busy} onClick={() => window.confirm("ব্যর্থ করে টাকা ফেরত দেবেন?") && act(o.id, "Failed", "", "ব্যর্থ, টাকা ফেরত")}>
                    ব্যর্থ+রিফান্ড
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
