import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, MessageCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import TelecomReceipt, { ReceiptData } from "./TelecomReceipt";
import { Cur, copyText, fmtDate, money, parseSecret, secretToText, telRpcPin } from "../services/telecomService";
import { SA_STATUS_BN, SaOperator, SaOrder, SaProduct, saErr, saPillClass, saPrice, waLink, waOrderText } from "../services/saudiService";

type V = "ops" | "products" | "detail" | "orders";

const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-sm px-4 py-3 rounded-xl disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60";

function Logo({ op, size }: { op: { name: string; logo_url: string | null }; size: number }) {
  return op.logo_url ? (
    <img src={op.logo_url} alt={op.name} loading="lazy" style={{ width: size, height: size }} className="object-contain" />
  ) : (
    <div style={{ width: size, height: size, fontSize: size * 0.4 }} className="rounded-full bg-teal text-white font-extrabold flex items-center justify-center">
      {op.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function SaudiShop({
  resellerId,
  bal,
  pinSet,
  whatsapp,
  startOrders,
  onChanged,
  onToast,
  onNeedPin
}: {
  resellerId: string;
  bal: Record<Cur, number>;
  pinSet: boolean | null;
  whatsapp: string;
  startOrders?: boolean;
  onChanged: () => void;
  onToast: (m: string, t?: "success" | "error") => void;
  onNeedPin: () => void;
}) {
  const [view, setView] = useState<V>(startOrders ? "orders" : "ops");
  const [ops, setOps] = useState<SaOperator[]>([]);
  const [prods, setProds] = useState<SaProduct[]>([]);
  const [orders, setOrders] = useState<SaOrder[]>([]);
  const [op, setOp] = useState<SaOperator | null>(null);
  const [pr, setPr] = useState<SaProduct | null>(null);
  const [cur, setCur] = useState<Cur>("SAR");
  const [dest, setDest] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<SaOrder | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const load = useCallback(async () => {
    const [o, p, r] = await Promise.all([
      supabase.from("telecom_sa_operators").select("*").eq("is_active", true).order("sort_order").order("id"),
      supabase.from("telecom_sa_products").select("*").eq("is_active", true).order("sort_order").order("id"),
      supabase.from("telecom_sa_orders").select("*").eq("reseller_id", resellerId).order("id", { ascending: false }).limit(100)
    ]);
    setOps((o.data ?? []) as SaOperator[]);
    setProds((p.data ?? []) as SaProduct[]);
    setOrders((r.data ?? []) as SaOrder[]);
  }, [resellerId]);

  useEffect(() => {
    load();
  }, [load]);

  const back = () => {
    if (view === "detail") setView("products");
    else if (view === "products") setView("ops");
    else if (view === "orders") setView("ops");
  };

  const copy = async (s: string) => {
    const ok = await copyText(s);
    onToast(ok ? "কপি হয়েছে" : "কপি করা গেল না", ok ? "success" : "error");
  };

  async function submit() {
    if (!pr) return;
    if (pinSet === false) {
      onToast("আগে একটি পিন সেট করুন", "error");
      onNeedPin();
      return;
    }
    setBusy(true);
    try {
      const res = await telRpcPin("telecom_sa_order", { p_product: pr.id, p_currency: cur, p_dest: dest, p_pin: pin });
      await load();
      onChanged();
      const { data } = await supabase.from("telecom_sa_orders").select("*").eq("id", res.id ?? 0).maybeSingle();
      setDone((data as SaOrder) ?? null);
      setPin("");
      setDest("");
      onToast("অর্ডার জমা হয়েছে (Pending)", "success");
    } catch (e) {
      onToast(saErr(e), "error");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  function receiptOf(o: SaOrder): ReceiptData {
    return {
      heading: "সৌদি অর্ডারের রসিদ",
      title: `${o.operator_name} ${o.product_name}`,
      orderNo: `S${o.id}`,
      date: fmtDate(o.created_at),
      amountText: money(o.currency, o.amount),
      status: o.status,
      info: [{ label: "অপারেটর", value: o.operator_name }, ...(o.dest_number ? [{ label: "নম্বর", value: o.dest_number }] : [])],
      rows: o.status === "Completed" ? parseSecret(o.secret) : [],
      note: o.status === "Completed" ? o.fulfil_note : o.reject_reason
    };
  }

  const waBtn = (o: SaOrder) =>
    whatsapp ? (
      <a href={waLink(whatsapp, waOrderText(o))} target="_blank" rel="noopener noreferrer" className="press bg-[#25D366] text-white font-bold text-xs px-3 py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5">
        <MessageCircle size={14} /> Send Order via WhatsApp
      </a>
    ) : null;

  const header = (title: string) => (
    <div className="flex items-center gap-3 mb-3">
      {view !== "ops" && (
        <button className="press w-9 h-9 rounded-full bg-teal-tint text-teal-dark flex items-center justify-center" onClick={back} aria-label="পেছনে">
          <ArrowLeft size={16} />
        </button>
      )}
      <div className="font-extrabold text-base flex-1">{title}</div>
      {view === "ops" && (
        <button className={btnGhost} onClick={() => setView("orders")}>
          আমার অর্ডার ({orders.length})
        </button>
      )}
    </div>
  );

  if (done) {
    return (
      <div className={card + " text-center"}>
        <div className="text-4xl mb-2">✅</div>
        <div className="font-extrabold text-base">অর্ডার জমা হয়েছে</div>
        <div className="text-xs text-mute mt-1">অর্ডার নম্বর S{done.id} · স্ট্যাটাস: Pending</div>
        <div className="text-xs bg-teal-tint rounded-xl p-3 mt-3 text-left">
          {done.operator_name} {done.product_name}
          <br />
          মূল্য: <b>{money(done.currency, done.amount)}</b>
        </div>
        <div className="text-[11px] text-mute mt-3">অ্যাডমিন প্রসেস করলে অর্ডারটি Completed হবে। {done.ptype === "voucher" ? "তখন কোড এই অর্ডারের ভেতরে দেখা যাবে।" : "রিচার্জ হওয়ার পর স্ট্যাটাস বদলাবে।"} WhatsApp এ পাঠানো ঐচ্ছিক।</div>
        <div className="grid gap-2 mt-4">
          {waBtn(done)}
          <button className={btnGhost} onClick={() => { setDone(null); setView("orders"); }}>
            আমার অর্ডার দেখুন
          </button>
          <button className={btnGhost} onClick={() => { setDone(null); setView("ops"); }}>
            আরও কিনুন
          </button>
        </div>
      </div>
    );
  }

  if (view === "ops") {
    return (
      <>
        {header("Telecom Operators")}
        <div className="text-[11px] bg-orange-tint rounded-xl p-2.5 mb-3 text-ink">অর্ডার যেকোনো সময় দেওয়া যায়। অ্যাডমিন অনলাইনে এসে প্রসেস করলে স্ট্যাটাস বদলাবে।</div>
        {ops.length === 0 && <div className="text-xs text-mute text-center py-6">এখনো কোনো অপারেটর নেই</div>}
        <div className="grid grid-cols-3 gap-3">
          {ops.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setOp(o);
                setView("products");
              }}
              className="press bg-[#F5F6FA] rounded-3xl p-3 flex flex-col items-center justify-center gap-2 min-h-[120px]"
            >
              <Logo op={o} size={52} />
              <span className="text-[13px] font-bold text-ink text-center leading-tight">{o.name}</span>
            </button>
          ))}
        </div>
        {orders.length > 0 && (
          <button className={btnGhost + " w-full mt-4"} onClick={() => setView("orders")}>
            আমার অর্ডার দেখুন
          </button>
        )}
      </>
    );
  }

  if (view === "products" && op) {
    const list = prods.filter((p) => p.operator_id === op.id);
    return (
      <>
        {header(`${op.name}`)}
        {list.length === 0 && <div className="text-xs text-mute text-center py-6">এই অপারেটরের কোনো পণ্য এখন নেই</div>}
        <div className="grid grid-cols-2 gap-3">
          {list.map((p) => {
            const price = p.price_sar > 0 ? money("SAR", p.price_sar) : p.price_bdt > 0 ? money("BDT", p.price_bdt) : "";
            return (
              <button
                key={p.id}
                disabled={!p.in_stock}
                onClick={() => {
                  setPr(p);
                  setCur(p.price_sar > 0 ? "SAR" : "BDT");
                  setDest("");
                  setPin("");
                  setView("detail");
                }}
                className="press bg-white rounded-3xl p-3 text-left shadow-sm border border-border disabled:opacity-60"
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} loading="lazy" className="w-full aspect-[1.45] object-cover rounded-2xl border border-border" />
                ) : (
                  <div className="w-full aspect-[1.45] rounded-2xl bg-teal-tint flex items-center justify-center">
                    <Logo op={op} size={48} />
                  </div>
                )}
                <div className="font-extrabold text-[15px] leading-snug mt-2.5">{p.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-bold text-teal-dark text-sm">{price}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.in_stock ? "bg-teal-tint text-teal-dark" : "bg-red-50 text-red-600"}`}>{p.in_stock ? "In Stock" : "Out of Stock"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  if (view === "detail" && pr && op) {
    const price = saPrice(pr, cur);
    const enough = bal[cur] >= price;
    const canBdt = pr.price_bdt > 0;
    const canSar = pr.price_sar > 0;
    return (
      <>
        {header(pr.name)}
        {pr.image_url ? (
          <img src={pr.image_url} alt={pr.name} className="w-full rounded-3xl border border-border mb-4" />
        ) : (
          <div className="w-full aspect-[1.7] rounded-3xl bg-teal-tint flex items-center justify-center mb-4">
            <Logo op={op} size={72} />
          </div>
        )}
        <div className="text-sm text-ink mb-2">Select product type</div>
        <div className="mb-3">
          <span className="inline-block border-2 border-teal text-teal-dark font-bold text-sm rounded-full px-4 py-2 bg-teal-tint">{pr.ptype === "direct" ? "Direct" : "Voucher"}</span>
        </div>
        <div className="text-sm text-mute mb-3">
          {pr.ptype === "direct"
            ? "রিচার্জ নিচের নম্বরে দেওয়া হবে। এটি অ্যাডমিন হাতে (ম্যানুয়ালি) করবে; সম্পন্ন হলেই Completed দেখাবে।"
            : "কেনার পর অ্যাডমিন কোড দিলে অর্ডারের ভেতরে কোড দেখতে পাবেন। তার আগে কোড লুকানো থাকে।"}
        </div>
        {pr.description && <div className="text-xs text-mute mb-2 whitespace-pre-line">{pr.description}</div>}
        {pr.validity && <div className="text-xs text-mute mb-2">মেয়াদ: {pr.validity}</div>}
        {pr.instructions && <div className="text-xs bg-orange-tint rounded-xl p-3 mb-3 whitespace-pre-line">{pr.instructions}</div>}
        {pr.ptype === "direct" && (
          <>
            <label className="text-xs font-bold text-mute block mb-1">Enter mobile number</label>
            <input className="input mb-3" inputMode="tel" placeholder="05XXXXXXXX বা 9665XXXXXXXX" value={dest} onChange={(e) => setDest(e.target.value.replace(/[^\d+]/g, ""))} />
          </>
        )}
        {canSar && canBdt && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(["SAR", "BDT"] as Cur[]).map((c) => (
              <button key={c} onClick={() => setCur(c)} className={`press rounded-xl py-2 text-sm font-bold ${cur === c ? "bg-teal text-white" : "bg-teal-tint text-teal-dark"}`}>
                {c} ওয়ালেট
              </button>
            ))}
          </div>
        )}
        <div className="bg-white border border-border rounded-2xl p-3 text-sm mb-3">
          <div className="flex justify-between py-1"><span className="text-mute">মূল্য</span><b>{money(cur, price)}</b></div>
          <div className="flex justify-between py-1"><span className="text-mute">ফি</span><b>{money(cur, 0)}</b></div>
          <div className="flex justify-between py-1"><span className="text-mute">আপনার ওয়ালেট ({cur})</span><b className={enough ? "" : "text-red-600"}>{money(cur, bal[cur])}</b></div>
          <div className="flex justify-between py-1 border-t border-border mt-1 pt-2"><b>Total payable</b><b className="text-teal-dark text-base">{money(cur, price)}</b></div>
          {!enough && <div className="text-[11px] text-red-600 mt-1">ব্যালেন্স কম। আগে ডিপোজিট করুন।</div>}
        </div>
        <label className="text-xs font-bold text-mute block mb-1">আপনার পিন</label>
        <input className="input text-center tracking-[0.5em] mb-3" type="password" inputMode="numeric" maxLength={6} placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        <button className={btn + " w-full"} disabled={busy || !enough || pin.length < 4 || (pr.ptype === "direct" && dest.length < 9)} onClick={submit}>
          {busy ? "অপেক্ষা করুন…" : "অর্ডার দিন (Next)"}
        </button>
      </>
    );
  }

  // অর্ডার তালিকা
  return (
    <>
      {header("আমার সৌদি অর্ডার")}
      {orders.length === 0 && <div className="text-xs text-mute text-center py-6">এখনো কোনো অর্ডার নেই</div>}
      {orders.map((o) => {
        const rows = o.status === "Completed" ? parseSecret(o.secret) : [];
        return (
          <div key={o.id} className={card}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-extrabold text-sm leading-snug">
                  {o.operator_name} {o.product_name}
                </div>
                <div className="text-[11px] text-mute">
                  S{o.id} · {fmtDate(o.created_at)}
                  {o.dest_number ? ` · ${o.dest_number}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-extrabold text-sm">{money(o.currency, o.amount)}</div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${saPillClass(o.status)}`}>{SA_STATUS_BN[o.status]}</span>
              </div>
            </div>
            {o.status === "Completed" && (
              <div className="mt-3 space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 bg-teal-tint rounded-xl px-3 py-2">
                    <div className="flex-1 min-w-0">
                      {r.label && <div className="text-[10px] font-bold text-mute">{r.label}</div>}
                      <div className="font-mono text-[13px] font-bold break-all select-all">{r.value}</div>
                    </div>
                    <button className="press shrink-0 bg-white rounded-lg p-2 text-teal-dark border border-border" onClick={() => copy(r.value)} aria-label="কপি">
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
                {o.fulfil_note && <div className="text-[11px] text-mute whitespace-pre-line">{o.fulfil_note}</div>}
                {rows.length > 1 && (
                  <button className={btnGhost + " w-full"} onClick={() => copy(secretToText(rows))}>
                    সব কপি
                  </button>
                )}
              </div>
            )}
            {(o.status === "Rejected" || o.status === "Failed" || o.status === "Refunded") && (
              <div className="mt-2 text-[11px] text-red-600">
                {o.reject_reason ? `কারণ: ${o.reject_reason}. ` : ""}
                {o.refunded ? "টাকা ওয়ালেটে ফেরত গেছে।" : ""}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {waBtn(o)}
              <button className={btnGhost} onClick={() => setReceipt(receiptOf(o))}>
                রসিদ / শেয়ার
              </button>
            </div>
          </div>
        );
      })}
      {receipt && <TelecomReceipt data={receipt} onClose={() => setReceipt(null)} onToast={onToast} />}
    </>
  );
}
