import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../contexts/ToastContext";
import { uploadService } from "../services/uploadService";
import { fmtDate, money, telRpc, toMinor } from "../services/telecomService";
import { BankAccount, SA_STATUSES, SaOperator, SaOrder, SaProduct, SaStatus, saErr, saPillClass } from "../services/saudiService";

type Tab = "orders" | "catalog" | "banks" | "wa" | "report";
const TABS: { k: Tab; label: string }[] = [
  { k: "orders", label: "📥 অর্ডার" },
  { k: "catalog", label: "📦 ক্যাটালগ" },
  { k: "banks", label: "🏦 ব্যাংক" },
  { k: "wa", label: "💬 WhatsApp" },
  { k: "report", label: "📄 রিপোর্ট" }
];

const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnRed = "press bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";

type Res = { id: string; name: string; mobile: string };
type AuditRow = { id: number; action: string; detail: Record<string, unknown> | null; created_at: string };

interface ProdForm {
  operator_id: string;
  name: string;
  denomination: string;
  sar: string;
  bdt: string;
  ptype: "voucher" | "direct";
  image_url: string;
  description: string;
  instructions: string;
  validity: string;
  in_stock: boolean;
  is_active: boolean;
}
const EMPTY_P: ProdForm = { operator_id: "", name: "", denomination: "", sar: "", bdt: "", ptype: "voucher", image_url: "", description: "", instructions: "", validity: "", in_stock: true, is_active: true };

interface BankForm {
  bank_name: string;
  account_name: string;
  iban: string;
  qr_url: string;
  instructions: string;
  currency: string;
  is_active: boolean;
}
const EMPTY_B: BankForm = { bank_name: "", account_name: "", iban: "", qr_url: "", instructions: "", currency: "SAR", is_active: true };

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

export default function AdminTelecomSaudi({ resellers }: { resellers: Res[] }) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("orders");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ops, setOps] = useState<SaOperator[]>([]);
  const [prods, setProds] = useState<SaProduct[]>([]);
  const [orders, setOrders] = useState<SaOrder[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [stockCount, setStockCount] = useState<Record<number, number>>({});
  const [wa, setWa] = useState("");

  // ফিল্টার
  const [fOp, setFOp] = useState("");
  const [fSt, setFSt] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fQ, setFQ] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [secret, setSecret] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  // ক্যাটালগ
  const [newOp, setNewOp] = useState("");
  const [np, setNp] = useState<ProdForm>(EMPTY_P);
  const [editPid, setEditPid] = useState<number | null>(null);
  const [ep, setEp] = useState<ProdForm>(EMPTY_P);
  const [stockText, setStockText] = useState<Record<number, string>>({});
  // ব্যাংক
  const [nb, setNb] = useState<BankForm>(EMPTY_B);
  const [editBid, setEditBid] = useState<number | null>(null);
  const [eb, setEb] = useState<BankForm>(EMPTY_B);

  const load = useCallback(async () => {
    const [o, p, r, b, st, s] = await Promise.all([
      supabase.from("telecom_sa_operators").select("*").order("sort_order").order("id"),
      supabase.from("telecom_sa_products").select("*").order("sort_order").order("id"),
      supabase.from("telecom_sa_orders").select("*").order("id", { ascending: false }).limit(500),
      supabase.from("telecom_bank_accounts").select("*").order("sort_order").order("id"),
      supabase.from("telecom_sa_stock").select("product_id").eq("status", "available"),
      supabase.from("telecom_settings").select("whatsapp_number").eq("id", 1).maybeSingle()
    ]);
    setOps((o.data ?? []) as SaOperator[]);
    setProds((p.data ?? []) as SaProduct[]);
    setOrders((r.data ?? []) as SaOrder[]);
    setBanks((b.data ?? []) as BankAccount[]);
    const c: Record<number, number> = {};
    ((st.data ?? []) as { product_id: number }[]).forEach((x) => (c[x.product_id] = (c[x.product_id] ?? 0) + 1));
    setStockCount(c);
    setWa(((s.data as { whatsapp_number?: string } | null)?.whatsapp_number) ?? "");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, okMsg: string): Promise<boolean> {
    setBusy(true);
    try {
      await fn();
      showToast(okMsg, "success");
      await load();
      return true;
    } catch (e) {
      showToast(saErr(e), "error");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function db(q: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await q;
    if (error) throw error;
  }
  async function upload(file: File | undefined, apply: (u: string) => void) {
    if (!file) return;
    const err = uploadService.validate(file);
    if (err) return showToast(err, "error");
    setUploading(true);
    try {
      const { url } = await uploadService.uploadProductImage(file, "telecom");
      apply(url);
      showToast("ছবি যোগ হয়েছে", "success");
    } catch (e) {
      showToast(saErr(e), "error");
    } finally {
      setUploading(false);
    }
  }

  const resName = (id: string) => resellers.find((r) => r.id === id)?.name ?? id.slice(0, 6);
  const resMobile = (id: string) => resellers.find((r) => r.id === id)?.mobile ?? "";
  const opName = (id: number) => ops.find((o) => o.id === id)?.name ?? "";

  const filtered = useMemo(() => {
    const q = fQ.trim().toLowerCase();
    return orders.filter((o) => {
      if (fOp && o.operator_name !== fOp) return false;
      if (fSt && o.status !== fSt) return false;
      const d = o.created_at.slice(0, 10);
      if (fFrom && d < fFrom) return false;
      if (fTo && d > fTo) return false;
      if (q && !(resName(o.reseller_id).toLowerCase().includes(q) || resMobile(o.reseller_id).includes(q) || `s${o.id}` === q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, fOp, fSt, fFrom, fTo, fQ, resellers]);

  async function openOrder(o: SaOrder) {
    if (openId === o.id) return setOpenId(null);
    setOpenId(o.id);
    setSecret("");
    setNote("");
    setReason("");
    const { data } = await supabase.from("telecom_audit").select("id,action,detail,created_at").eq("entity", "sa_order").eq("entity_ref", String(o.id)).order("id");
    setAudit((data ?? []) as AuditRow[]);
  }

  const prodPayload = (f: ProdForm) => ({
    operator_id: Number(f.operator_id),
    name: f.name.trim(),
    denomination: f.denomination.trim(),
    price_sar: toMinor(f.sar),
    price_bdt: toMinor(f.bdt),
    ptype: f.ptype,
    image_url: f.image_url || null,
    description: f.description.trim(),
    instructions: f.instructions.trim(),
    validity: f.validity.trim(),
    in_stock: f.in_stock,
    is_active: f.is_active
  });
  const bankPayload = (f: BankForm) => ({
    bank_name: f.bank_name.trim(),
    account_name: f.account_name.trim(),
    iban: f.iban.replace(/\s+/g, "").toUpperCase(),
    qr_url: f.qr_url || null,
    instructions: f.instructions.trim(),
    currency: f.currency || "SAR",
    is_active: f.is_active
  });

  // PDF রিপোর্ট (সিক্রেট কোড বা ব্যক্তিগত তথ্য ছাড়া); ফোনে Share → Save to Files/Print
  function printReport() {
    const list = filtered;
    const sumBy: Record<string, Record<string, number>> = {};
    list.filter((o) => o.status === "Completed").forEach((o) => {
      sumBy[o.operator_name] = sumBy[o.operator_name] ?? {};
      sumBy[o.operator_name][o.currency] = (sumBy[o.operator_name][o.currency] ?? 0) + Number(o.amount);
    });
    const rows = list
      .map((o) => `<tr><td>S${o.id}</td><td>${esc(o.operator_name)}</td><td>${esc(o.product_name)}</td><td>${esc(money(o.currency, o.amount))}</td><td>${esc(o.status)}${o.refunded ? " (refunded)" : ""}</td><td>${esc(fmtDate(o.created_at))}</td><td>${esc(fmtDate(o.updated_at))}</td></tr>`)
      .join("");
    const sums = Object.entries(sumBy)
      .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${Object.entries(v).map(([c, a]) => esc(money(c as "SAR" | "BDT", a))).join(" + ")}</td></tr>`)
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>J H Telecom - Saudi Orders Report</title><style>body{font-family:system-ui,sans-serif;padding:16px;color:#111}h1{font-size:18px}h2{font-size:14px;margin-top:18px}table{border-collapse:collapse;width:100%;font-size:11px}td,th{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#eef6f4}</style></head><body><h1>J H Telecom Reseller - Saudi Orders Report</h1><div>Filters: operator=${esc(fOp || "all")}, status=${esc(fSt || "all")}, from=${esc(fFrom || "-")}, to=${esc(fTo || "-")} | Orders: ${list.length}</div><h2>Completed sales by operator</h2><table><tr><th>Operator</th><th>Total</th></tr>${sums || "<tr><td colspan=2>-</td></tr>"}</table><h2>Orders</h2><table><tr><th>Ref</th><th>Operator</th><th>Product</th><th>Amount</th><th>Status</th><th>Created</th><th>Updated</th></tr>${rows}</table><script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return showToast("পপআপ আটকে গেছে। ব্রাউজারে পপআপ অনুমতি দিন", "error");
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function ProdFields({ v, set }: { v: ProdForm; set: (p: ProdForm) => void }) {
    return (
      <>
        <div className="flex items-center gap-3 mb-2">
          {v.image_url ? <img src={v.image_url} alt="" className="w-20 h-14 rounded-lg object-cover border border-border" /> : <div className="w-20 h-14 rounded-lg bg-teal-tint" />}
          <label className="press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5">
            <Upload size={14} /> {uploading ? "আপলোড হচ্ছে…" : "ছবি আপলোড"}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0], (u) => set({ ...v, image_url: u }))} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className="input col-span-2" value={v.operator_id} onChange={(e) => set({ ...v, operator_id: e.target.value })}>
            <option value="">অপারেটর বাছুন</option>
            {ops.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input className="input col-span-2" placeholder="পণ্যের নাম (যেমন Mobily Recharge 20)" value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} />
          <input className="input" placeholder="ডিনোমিনেশন (যেমন 20)" value={v.denomination} onChange={(e) => set({ ...v, denomination: e.target.value })} />
          <select className="input" value={v.ptype} onChange={(e) => set({ ...v, ptype: e.target.value as "voucher" | "direct" })}>
            <option value="voucher">Voucher (কোড)</option>
            <option value="direct">Direct (নম্বরে রিচার্জ)</option>
          </select>
          <input className="input" type="number" placeholder="বিক্রয় মূল্য SAR" value={v.sar} onChange={(e) => set({ ...v, sar: e.target.value })} />
          <input className="input" type="number" placeholder="মূল্য BDT (ঐচ্ছিক)" value={v.bdt} onChange={(e) => set({ ...v, bdt: e.target.value })} />
          <input className="input col-span-2" placeholder="মেয়াদ/ভ্যালিডিটি (ঐচ্ছিক)" value={v.validity} onChange={(e) => set({ ...v, validity: e.target.value })} />
        </div>
        <textarea className="input mt-2" rows={2} placeholder="বিবরণ (কাস্টমার দেখবে)" value={v.description} onChange={(e) => set({ ...v, description: e.target.value })} />
        <textarea className="input mt-2" rows={2} placeholder="ব্যবহারের নির্দেশনা" value={v.instructions} onChange={(e) => set({ ...v, instructions: e.target.value })} />
        <div className="flex gap-4 mt-2 text-xs">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={v.in_stock} onChange={(e) => set({ ...v, in_stock: e.target.checked })} /> স্টকে আছে</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={v.is_active} onChange={(e) => set({ ...v, is_active: e.target.checked })} /> কাস্টমারকে দেখাবে</label>
        </div>
      </>
    );
  }

  function BankFields({ v, set }: { v: BankForm; set: (b: BankForm) => void }) {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <input className="input col-span-2" placeholder="ব্যাংকের নাম" value={v.bank_name} onChange={(e) => set({ ...v, bank_name: e.target.value })} />
          <input className="input col-span-2" placeholder="অ্যাকাউন্টের নাম" value={v.account_name} onChange={(e) => set({ ...v, account_name: e.target.value })} />
          <input className="input col-span-2 font-mono" placeholder="IBAN নম্বর (SA…)" value={v.iban} onChange={(e) => set({ ...v, iban: e.target.value })} />
          <select className="input" value={v.currency} onChange={(e) => set({ ...v, currency: e.target.value })}>
            <option>SAR</option>
            <option>BDT</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={v.is_active} onChange={(e) => set({ ...v, is_active: e.target.checked })} /> চালু</label>
        </div>
        <textarea className="input mt-2" rows={2} placeholder="নির্দেশনা (ঐচ্ছিক)" value={v.instructions} onChange={(e) => set({ ...v, instructions: e.target.value })} />
        <div className="flex items-center gap-3 mt-2">
          {v.qr_url ? <img src={v.qr_url} alt="QR" className="w-20 h-20 rounded-lg object-contain border border-border bg-white" /> : <div className="w-20 h-20 rounded-lg bg-teal-tint flex items-center justify-center text-[10px] text-mute">QR নেই</div>}
          <label className="press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5">
            <Upload size={14} /> {uploading ? "আপলোড হচ্ছে…" : "QR কোড আপলোড"}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0], (u) => set({ ...v, qr_url: u }))} />
          </label>
          {v.qr_url && <button className="press text-[11px] text-red-500 font-semibold" onClick={() => set({ ...v, qr_url: "" })}>সরান</button>}
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto bg-teal-tint p-1 rounded-xl mb-3">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`press shrink-0 text-xs font-bold px-3 py-2 rounded-lg ${tab === t.k ? "bg-white text-teal-dark shadow" : "text-teal-dark/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">Saudi Recharge &amp; Card Orders</div>
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={fOp} onChange={(e) => setFOp(e.target.value)}>
                <option value="">সব অপারেটর</option>
                {ops.map((o) => (<option key={o.id}>{o.name}</option>))}
              </select>
              <select className="input" value={fSt} onChange={(e) => setFSt(e.target.value)}>
                <option value="">সব স্ট্যাটাস</option>
                {SA_STATUSES.map((s) => (<option key={s}>{s}</option>))}
              </select>
              <input className="input" type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
              <input className="input" type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
              <input className="input col-span-2" placeholder="কাস্টমারের নাম/মোবাইল বা S12" value={fQ} onChange={(e) => setFQ(e.target.value)} />
            </div>
            <div className="text-[11px] text-mute mt-2">
              মোট {filtered.length}টি · Pending {filtered.filter((o) => o.status === "Pending").length}
            </div>
          </div>
          {filtered.length === 0 && <div className="text-xs text-mute text-center py-6">কোনো অর্ডার নেই</div>}
          {filtered.map((o) => {
            const final = ["Completed", "Rejected", "Failed", "Refunded"].includes(o.status);
            return (
              <div key={o.id} className={card}>
                <button className="w-full text-left" onClick={() => openOrder(o)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm">S{o.id} · {o.operator_name} {o.product_name}</div>
                      <div className="text-[11px] text-mute">{resName(o.reseller_id)} · {resMobile(o.reseller_id)} · {fmtDate(o.created_at)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-sm">{money(o.currency, o.amount)}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${saPillClass(o.status)}`}>{o.status}</span>
                    </div>
                  </div>
                </button>
                {openId === o.id && (
                  <div className="mt-3 pt-3 border-t border-border text-xs">
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <div className="bg-teal-tint rounded-lg p-2">ধরন: <b>{o.ptype === "direct" ? "Direct" : "Voucher"}</b></div>
                      <div className="bg-teal-tint rounded-lg p-2">ডিনোমিনেশন: <b>{o.denomination || "-"}</b></div>
                      {o.dest_number && <div className="bg-teal-tint rounded-lg p-2 col-span-2">গন্তব্য নম্বর: <b className="select-all">{o.dest_number}</b></div>}
                    </div>
                    {o.status === "Completed" && (
                      <div className="mb-2">
                        {o.secret && <div className="bg-teal-tint rounded-lg p-2 font-mono break-all whitespace-pre-line select-all">{o.secret}</div>}
                        {o.fulfil_note && <div className="text-mute mt-1 whitespace-pre-line">রেজাল্ট: {o.fulfil_note}</div>}
                      </div>
                    )}
                    {o.reject_reason && <div className="text-red-600 mb-2">কারণ: {o.reject_reason}{o.refunded ? " (টাকা ফেরত হয়েছে)" : ""}</div>}

                    {!final && (
                      <>
                        <div className="flex gap-2 mb-3">
                          <button className={btnGhost} disabled={busy} onClick={() => run(() => telRpc("telecom_sa_admin_set_status", { p_id: o.id, p_status: "Processing" }), "Processing")}>Processing</button>
                          <button className={btnGhost} disabled={busy} onClick={() => run(() => telRpc("telecom_sa_admin_set_status", { p_id: o.id, p_status: "Confirmed" }), "Confirmed")}>Confirmed</button>
                        </div>
                        <div className="font-bold text-mute mb-1">{o.ptype === "voucher" ? "ভাউচার কোড / কার্ডের তথ্য (শুধু আপনি দেখছেন)" : "রিচার্জ হওয়ার প্রমাণ (রেফারেন্স)"}</div>
                        {o.ptype === "voucher" && (
                          <textarea className="input mb-2" rows={3} placeholder={"কোড লিখুন। একাধিক লাইন চলবে:\nVoucher Code: 1234 5678 9012\nখালি রাখলে স্টক থেকে একটা নেবে"} value={secret} onChange={(e) => setSecret(e.target.value)} />
                        )}
                        <input className="input mb-2" placeholder={o.ptype === "direct" ? "রেফারেন্স/ফলাফল (আবশ্যক)" : "নোট (ঐচ্ছিক, কাস্টমার দেখবে)"} value={note} onChange={(e) => setNote(e.target.value)} />
                        <button
                          className={btn}
                          disabled={busy}
                          onClick={async () => {
                            if (!window.confirm(o.ptype === "voucher" ? "কোড সেভ করে অর্ডার Completed করবেন? কাস্টমার সাথে সাথে দেখতে পাবে।" : "রিচার্জ সত্যিই হয়ে গেছে? Completed করবেন?")) return;
                            const ok = await run(() => telRpc("telecom_sa_admin_fulfil", { p_id: o.id, p_secret: secret, p_note: note }), "Completed");
                            if (ok) setOpenId(null);
                          }}
                        >
                          ✔ সম্পন্ন করুন (Completed)
                        </button>
                        <div className="font-bold text-mute mt-4 mb-1">বাতিল / রিফান্ড (কারণ আবশ্যক, টাকা একবারই ফেরত যায়)</div>
                        <input className="input mb-2" placeholder="কারণ" value={reason} onChange={(e) => setReason(e.target.value)} />
                        <div className="flex gap-2 flex-wrap">
                          {(["Rejected", "Failed", "Refunded"] as SaStatus[]).map((s) => (
                            <button key={s} className={btnRed} disabled={busy} onClick={() => window.confirm(`${s} করে ওয়ালেটে টাকা ফেরত দেবেন?`) && run(() => telRpc("telecom_sa_admin_close", { p_id: o.id, p_status: s, p_reason: reason }), s)}>
                              {s === "Rejected" ? "Reject" : s === "Failed" ? "Failed" : "Refund"}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="font-bold text-mute mt-4 mb-1">অডিট ট্রেইল</div>
                    {audit.length === 0 ? (
                      <div className="text-mute">কোনো লগ নেই</div>
                    ) : (
                      audit.map((a) => (
                        <div key={a.id} className="border-t border-border py-1">
                          {fmtDate(a.created_at)} · {a.action}
                          {a.detail && Object.keys(a.detail).length > 0 ? ` · ${JSON.stringify(a.detail)}` : ""}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {tab === "catalog" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">অপারেটর</div>
            {ops.map((o) => (
              <div key={o.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                {o.logo_url ? <img src={o.logo_url} alt="" className="w-9 h-9 object-contain" /> : <div className="w-9 h-9 rounded-full bg-teal text-white text-xs font-bold flex items-center justify-center">{o.name.slice(0, 2).toUpperCase()}</div>}
                <div className="flex-1 min-w-0 text-sm font-bold">{o.name} {o.is_active ? "" : <span className="text-mute font-normal">(বন্ধ)</span>}</div>
                <label className="press bg-teal-tint text-teal-dark text-[11px] font-bold px-2 py-1.5 rounded-lg cursor-pointer">
                  লোগো
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0], (u) => run(() => db(supabase.from("telecom_sa_operators").update({ logo_url: u }).eq("id", o.id)), "লোগো সংরক্ষিত"))} />
                </label>
                <button className={btnGhost} disabled={busy} onClick={() => run(() => db(supabase.from("telecom_sa_operators").update({ is_active: !o.is_active }).eq("id", o.id)), o.is_active ? "বন্ধ হয়েছে" : "চালু হয়েছে")}>{o.is_active ? "বন্ধ" : "চালু"}</button>
                <button
                  className={btnRed}
                  disabled={busy}
                  onClick={() => window.confirm(`${o.name} মুছবেন? পণ্য বা অর্ডার থাকলে মোছা যাবে না, তখন "বন্ধ" করুন।`) && run(() => db(supabase.from("telecom_sa_operators").delete().eq("id", o.id)), "মোছা হয়েছে")}
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <input className="input" placeholder="নতুন অপারেটরের নাম" value={newOp} onChange={(e) => setNewOp(e.target.value)} />
              <button className={btn} disabled={busy || !newOp.trim()} onClick={async () => { const ok = await run(() => db(supabase.from("telecom_sa_operators").insert({ name: newOp.trim(), sort_order: ops.length + 1 })), "যোগ হয়েছে"); if (ok) setNewOp(""); }}>যোগ</button>
            </div>
          </div>

          <div className={card}>
            <div className="font-extrabold text-sm mb-2">নতুন পণ্য / কার্ড</div>
            {ProdFields({ v: np, set: setNp })}
            <button
              className={btn + " mt-3"}
              disabled={busy || uploading || !np.name.trim() || !np.operator_id}
              onClick={async () => { const ok = await run(() => db(supabase.from("telecom_sa_products").insert(prodPayload(np))), "পণ্য যোগ হয়েছে"); if (ok) setNp(EMPTY_P); }}
            >
              যোগ করুন
            </button>
          </div>

          {prods.map((p) => (
            <div key={p.id} className={card}>
              <div className="flex items-center gap-3">
                {p.image_url ? <img src={p.image_url} alt="" className="w-16 h-11 rounded-lg object-cover border border-border" /> : <div className="w-16 h-11 rounded-lg bg-teal-tint" />}
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm">{opName(p.operator_id)} · {p.name}</div>
                  <div className="text-[11px] text-mute">
                    {p.ptype === "direct" ? "Direct" : "Voucher"} · {money("SAR", p.price_sar)}{p.price_bdt ? ` / ${money("BDT", p.price_bdt)}` : ""} · {p.is_active ? "দৃশ্যমান" : "লুকানো"} · {p.in_stock ? "স্টকে" : "স্টক নেই"}
                    {p.ptype === "voucher" ? ` · কোড স্টক: ${stockCount[p.id] ?? 0}` : ""}
                  </div>
                </div>
              </div>
              {editPid === p.id ? (
                <div className="mt-3 pt-3 border-t border-border">
                  {ProdFields({ v: ep, set: setEp })}
                  <div className="flex gap-2 mt-3">
                    <button className={btn} disabled={busy || uploading || !ep.name.trim() || !ep.operator_id} onClick={async () => { const ok = await run(() => db(supabase.from("telecom_sa_products").update(prodPayload(ep)).eq("id", p.id)), "সংরক্ষিত"); if (ok) setEditPid(null); }}>সংরক্ষণ</button>
                    <button className={btnGhost} onClick={() => setEditPid(null)}>বাতিল</button>
                    <button className={btnRed} disabled={busy} onClick={() => window.confirm("পণ্য মুছবেন? অর্ডার থাকলে মোছা যাবে না, তখন লুকিয়ে রাখুন।") && run(() => db(supabase.from("telecom_sa_products").delete().eq("id", p.id)), "মোছা হয়েছে")}>মুছুন</button>
                  </div>
                </div>
              ) : (
                <button
                  className={btnGhost + " mt-2"}
                  onClick={() => {
                    setEditPid(p.id);
                    setEp({
                      operator_id: String(p.operator_id), name: p.name, denomination: p.denomination,
                      sar: p.price_sar ? String(p.price_sar / 100) : "", bdt: p.price_bdt ? String(p.price_bdt / 100) : "",
                      ptype: p.ptype, image_url: p.image_url ?? "", description: p.description, instructions: p.instructions,
                      validity: p.validity, in_stock: p.in_stock, is_active: p.is_active
                    });
                  }}
                >
                  ✏ সম্পাদনা
                </button>
              )}
              {p.ptype === "voucher" && (
                <>
                  <div className="text-xs font-bold text-mute mt-3 mb-1">ভাউচার কোড স্টক (প্রতি লাইনে একটা বা একটা কার্ডের সব লাইন একসাথে, কার্ডের মাঝে ফাঁকা লাইন)</div>
                  <textarea className="input" rows={3} value={stockText[p.id] ?? ""} onChange={(e) => setStockText({ ...stockText, [p.id]: e.target.value })} />
                  <button
                    className={btn + " mt-2"}
                    disabled={busy || !(stockText[p.id] ?? "").trim()}
                    onClick={async () => {
                      const raw = (stockText[p.id] ?? "").replace(/\r/g, "");
                      const items = raw.split(/\n\s*\n/).map((b) => b.split("\n").map((s) => s.trim()).filter(Boolean).join("\n")).filter(Boolean);
                      const ok = await run(() => db(supabase.from("telecom_sa_stock").insert(items.map((secret) => ({ product_id: p.id, secret })))), `${items.length}টা কোড যোগ হয়েছে`);
                      if (ok) setStockText({ ...stockText, [p.id]: "" });
                    }}
                  >
                    স্টকে যোগ
                  </button>
                </>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "banks" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-1">ব্যাংক অ্যাকাউন্ট (ওয়ালেটে টাকা জমার জন্য)</div>
            <div className="text-[11px] text-mute mb-3">রিসেলার ডিপোজিটের সময় ব্যাংকের নাম, IBAN (কপি বোতামসহ) ও QR দেখবে।</div>
            {BankFields({ v: nb, set: setNb })}
            <button className={btn + " mt-3"} disabled={busy || uploading || !nb.bank_name.trim() || !nb.iban.trim()} onClick={async () => { const ok = await run(() => db(supabase.from("telecom_bank_accounts").insert({ ...bankPayload(nb), sort_order: banks.length + 1 })), "ব্যাংক যোগ হয়েছে"); if (ok) setNb(EMPTY_B); }}>যোগ করুন</button>
          </div>
          {banks.map((b) => (
            <div key={b.id} className={card}>
              <div className="flex items-start gap-3">
                {b.qr_url && <img src={b.qr_url} alt="QR" className="w-16 h-16 object-contain border border-border rounded-lg bg-white" />}
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-extrabold text-sm">{b.bank_name} {b.is_active ? "" : <span className="text-mute font-normal">(বন্ধ)</span>}</div>
                  <div>{b.account_name}</div>
                  <div className="font-mono break-all">{b.iban}</div>
                </div>
              </div>
              {editBid === b.id ? (
                <div className="mt-3 pt-3 border-t border-border">
                  {BankFields({ v: eb, set: setEb })}
                  <div className="flex gap-2 mt-3">
                    <button className={btn} disabled={busy || uploading} onClick={async () => { const ok = await run(() => db(supabase.from("telecom_bank_accounts").update(bankPayload(eb)).eq("id", b.id)), "সংরক্ষিত"); if (ok) setEditBid(null); }}>সংরক্ষণ</button>
                    <button className={btnGhost} onClick={() => setEditBid(null)}>বাতিল</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button className={btnGhost} onClick={() => { setEditBid(b.id); setEb({ bank_name: b.bank_name, account_name: b.account_name, iban: b.iban, qr_url: b.qr_url ?? "", instructions: b.instructions, currency: b.currency, is_active: b.is_active }); }}>✏ সম্পাদনা</button>
                  <button className={btnRed} disabled={busy} onClick={() => window.confirm("এই ব্যাংক মুছবেন?") && run(() => db(supabase.from("telecom_bank_accounts").delete().eq("id", b.id)), "মোছা হয়েছে")}>মুছুন</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "wa" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-1">WhatsApp ব্যবসায়িক নম্বর</div>
          <div className="text-[11px] text-mute mb-3">দেশের কোডসহ শুধু অঙ্কে লিখুন (যেমন 9665XXXXXXXX)। ফাঁকা রাখলে কাস্টমারের WhatsApp বোতাম দেখাবে না। আমি কোনো নম্বর বানাইনি।</div>
          <input className="input mb-3" inputMode="numeric" placeholder="WhatsApp নম্বর" value={wa} onChange={(e) => setWa(e.target.value.replace(/[^\d]/g, ""))} />
          <button className={btn} disabled={busy} onClick={() => run(() => db(supabase.from("telecom_settings").update({ whatsapp_number: wa }).eq("id", 1)), "সংরক্ষিত")}>সংরক্ষণ</button>
        </div>
      )}

      {tab === "report" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-1">PDF রিপোর্ট</div>
          <div className="text-[11px] text-mute mb-3">"অর্ডার" ট্যাবের ফিল্টার (অপারেটর, স্ট্যাটাস, তারিখ) এখানেও লাগে। রিপোর্টে কোড বা ব্যক্তিগত তথ্য থাকে না। বোতাম চাপলে প্রিন্ট পেজ খুলবে; iPhone এ Share → Print থেকে PDF সেভ করুন।</div>
          <div className="text-xs mb-3">
            এখন ফিল্টারে: {filtered.length}টি অর্ডার · Completed {filtered.filter((o) => o.status === "Completed").length} · Failed/Rejected/Refunded {filtered.filter((o) => ["Failed", "Rejected", "Refunded"].includes(o.status)).length}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input className="input" type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
            <input className="input" type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
            <select className="input" value={fOp} onChange={(e) => setFOp(e.target.value)}>
              <option value="">সব অপারেটর</option>
              {ops.map((o) => (<option key={o.id}>{o.name}</option>))}
            </select>
            <select className="input" value={fSt} onChange={(e) => setFSt(e.target.value)}>
              <option value="">সব স্ট্যাটাস</option>
              {SA_STATUSES.map((s) => (<option key={s}>{s}</option>))}
            </select>
          </div>
          <button className={btn} onClick={printReport}>📄 PDF রিপোর্ট খুলুন</button>
        </div>
      )}
    </div>
  );
}
