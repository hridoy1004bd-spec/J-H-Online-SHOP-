import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../contexts/ToastContext";
import { rpc } from "../services/platformService";
import { accountCreate } from "../pages/admin/AdminAccounts";

interface Row {
  reseller_id: string;
  name: string;
  mobile: string;
  status: string;
  extra_pct: number;
}
const inp = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500";

export default function DsResellers() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState({ name: "", mobile: "", password: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await rpc<Row[]>("ds_my_resellers", {});
      setRows(data ?? []);
    } catch {
      setRows([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    setSaving(true);
    try {
      await accountCreate({ role: "reseller", ...f });
      showToast("রিসেলার যোগ হয়েছে — অ্যাডমিন অনুমোদন দিলে চালু হবে ✓");
      setF({ name: "", mobile: "", password: "" });
      load();
    } catch (e) {
      showToast((e as Error).message, "error");
    }
    setSaving(false);
  }
  void supabase;

  return (
    <div>
      <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-bold">নতুন রিসেলার যোগ করুন</h3>
        <div className="grid gap-2">
          <input className={inp} placeholder="নাম" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={inp} placeholder="মোবাইল (01XXXXXXXXX)" inputMode="numeric" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} />
          <input className={inp} placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <button className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60" disabled={saving} onClick={add}>
            {saving ? "..." : "রিসেলার যোগ করুন"}
          </button>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-bold">আমার রিসেলার ({rows.length})</h3>
        {rows.length === 0 && <p className="text-sm text-slate-500">এখনো কোনো রিসেলার নেই।</p>}
        {rows.map((r) => (
          <div key={r.reseller_id} className="flex justify-between border-t border-slate-100 py-2 text-sm">
            <div>
              <b>{r.name}</b> <span className="text-xs text-slate-500">{r.mobile}</span>
            </div>
            <div className="text-xs">
              {r.status === "Approved" ? "সক্রিয়" : "অনুমোদনের অপেক্ষায়"} · বাড়তি {Number(r.extra_pct)}%
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
