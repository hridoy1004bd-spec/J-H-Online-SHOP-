import React, { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { platErr, rpc } from "../../services/platformService";

const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const lbl = "block text-[11px] font-bold text-mute mb-1";

interface Partner { id: string; name: string; mobile: string }
interface LinkRow { reseller_id: string; ds_partner_id: string; extra_pct: number }
interface Reseller { id: string; name: string; mobile: string; status: string }

const ERR: Record<string, string> = {
  INVALID_MOBILE: "মোবাইল নম্বর ঠিক নয়",
  NAME_REQUIRED: "নাম দিন",
  WEAK_PASSWORD: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর",
  ROLE_EXISTS: "এই ব্যক্তির আগেই একটি ভূমিকা আছে (একজন = একটি ভূমিকা)",
  ACCOUNT_EXISTS: "এই নম্বরে অ্যাকাউন্ট আছে",
  FORBIDDEN: "অনুমতি নেই"
};

export async function accountCreate(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("account-create", { body });
  if (error) {
    let code = "";
    try {
      const j = await (error as unknown as { context?: Response }).context?.json();
      code = j?.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(ERR[code] ?? "অ্যাকাউন্ট তৈরি হয়নি");
  }
  return data;
}

export default function AdminAccounts() {
  const { showToast } = useToast();
  const [role, setRole] = useState<"dropshipper" | "reseller">("dropshipper");
  const [f, setF] = useState({ name: "", mobile: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [links, setLinks] = useState<Record<string, LinkRow>>({});
  const [edit, setEdit] = useState<Record<string, { p: string; x: string }>>({});

  const load = useCallback(async () => {
    const [p, r, l] = await Promise.all([
      supabase.from("ds_partners").select("id,name,mobile").eq("status", "Approved").order("name"),
      supabase.from("telecom_resellers").select("id,name,mobile,status").order("created_at", { ascending: false }),
      supabase.from("ds_reseller_links").select("*")
    ]);
    setPartners((p.data as Partner[]) ?? []);
    setResellers((r.data as Reseller[]) ?? []);
    const m: Record<string, LinkRow> = {};
    ((l.data as LinkRow[]) ?? []).forEach((x) => (m[x.reseller_id] = x));
    setLinks(m);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setSaving(true);
    try {
      await accountCreate({ role, ...f });
      showToast("অ্যাকাউন্ট তৈরি হয়েছে ✓");
      setF({ name: "", mobile: "", password: "" });
      load();
    } catch (e) {
      showToast((e as Error).message, "error");
    }
    setSaving(false);
  }
  async function saveLink(rid: string, e: { p: string; x: string }) {
    try {
      await rpc("ds_admin_link_reseller", { p_reseller: rid, p_partner: e.p || null, p_extra: Number(e.x || 0) });
      showToast("সেভ হয়েছে ✓");
      load();
    } catch (er) {
      showToast(platErr(er), "error");
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-lg font-extrabold mb-3 flex items-center gap-2"><UserPlus size={20} /> অ্যাকাউন্ট খুলুন ও লিংক</h1>

      <div className={card}>
        <div className="flex gap-2 mb-3">
          <button className={role === "dropshipper" ? btn : btnGhost} onClick={() => setRole("dropshipper")}>ড্রপশিপার</button>
          <button className={role === "reseller" ? btn : btnGhost} onClick={() => setRole("reseller")}>রিসেলার</button>
        </div>
        <label className={lbl}>নাম</label>
        <input className="input mb-2" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label className={lbl}>মোবাইল (01XXXXXXXXX)</label>
        <input className="input mb-2" inputMode="numeric" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} />
        <label className={lbl}>পাসওয়ার্ড (নতুন ব্যক্তির জন্য)</label>
        <input className="input mb-3" type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className={btn} disabled={saving} onClick={create}>{saving ? "..." : "অ্যাকাউন্ট খুলুন (অনুমোদিত)"}</button>
        <p className="text-[11px] text-mute mt-2">একজন ব্যক্তি = একটি ভূমিকা। ড্রপশিপার/রিসেলারের ডকুমেন্ট (আইডি, ছবি) পরে KYC ফর্ম থেকে নেওয়া যাবে।</p>
      </div>

      <h2 className="font-extrabold text-sm mb-2">রিসেলার → ড্রপশিপার লিংক ও বাড়তি কমিশন (%)</h2>
      {resellers.map((r) => {
        const l = links[r.id];
        const e = edit[r.id] ?? { p: l?.ds_partner_id ?? "", x: String(l?.extra_pct ?? 0) };
        return (
          <div key={r.id} className={card}>
            <div className="font-bold text-sm">{r.name} <span className="text-[11px] text-mute">{r.mobile} · {r.status}</span></div>
            <div className="flex gap-2 mt-2 items-end">
              <div className="flex-1">
                <label className={lbl}>ড্রপশিপার</label>
                <select className="input" value={e.p} onChange={(ev) => setEdit({ ...edit, [r.id]: { ...e, p: ev.target.value } })}>
                  <option value="">— নেই —</option>
                  {partners.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mobile})</option>)}
                </select>
              </div>
              <div className="w-20">
                <label className={lbl}>বাড়তি %</label>
                <input className="input" inputMode="decimal" value={e.x} onChange={(ev) => setEdit({ ...edit, [r.id]: { ...e, x: ev.target.value } })} />
              </div>
              <button className={btn} onClick={() => saveLink(r.id, e)}>সেভ</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
