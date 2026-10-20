import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import {
  DS_STATUS_BN,
  DsOrder,
  DsOrderStatus,
  DsPartner,
  DsProduct,
  DsSettings,
  DsWithdrawal,
  PRODUCT_SELECT,
  dsErr,
  dsRpc,
  fmtDT,
  productImage,
  productTitle,
  statusClass,
  tk
} from "../../services/dropshipService";

type Tab = "p" | "o" | "w" | "g" | "s";
const TABS: { k: Tab; label: string }[] = [
  { k: "p", label: "👥 ড্রপশিপার" },
  { k: "o", label: "📦 অর্ডার" },
  { k: "g", label: "🛍 পণ্য" },
  { k: "w", label: "💸 টাকা তোলা" },
  { k: "s", label: "⚙ সেটিংস" }
];

const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnRed = "press bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";

const NEXT: Record<string, { to: DsOrderStatus; label: string; red?: boolean }[]> = {
  Pending: [
    { to: "Confirmed", label: "নিশ্চিত করুন" },
    { to: "Cancelled", label: "বাতিল", red: true }
  ],
  Confirmed: [
    { to: "Shipped", label: "পাঠানো হয়েছে" },
    { to: "Cancelled", label: "বাতিল", red: true }
  ],
  Shipped: [
    { to: "Delivered", label: "ডেলিভারি সম্পন্ন (লাভ জমা)" },
    { to: "Returned", label: "ফেরত এসেছে", red: true }
  ]
};

interface ShopProd {
  id: string;
  name_bn: string | null;
  name_en: string | null;
  current_price: number;
}

function Pill({ s, label }: { s: string; label?: string }) {
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusClass(s)}`}>{label ?? s}</span>;
}

export default function AdminDropship() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("p");
  const [busy, setBusy] = useState(false);
  const [partners, setPartners] = useState<DsPartner[]>([]);
  const [orders, setOrders] = useState<DsOrder[]>([]);
  const [prods, setProds] = useState<DsProduct[]>([]);
  const [wds, setWds] = useState<DsWithdrawal[]>([]);
  const [settings, setSettings] = useState<DsSettings>({ enabled: true, delivery_charge: 0, min_withdraw: 500, notice: "", withdraw_note: "" });
  const [openId, setOpenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [wRef, setWRef] = useState<Record<number, string>>({});
  const [q, setQ] = useState("");
  const [found, setFound] = useState<ShopProd[]>([]);
  const [wh, setWh] = useState<Record<string, string>>({});

  const nameOf = (id: string) => partners.find((p) => p.id === id)?.name ?? id.slice(0, 6);

  const load = useCallback(async () => {
    const [p, o, g, w, s] = await Promise.all([
      supabase.from("ds_partners").select("*").order("created_at", { ascending: false }),
      supabase.from("ds_orders").select("*,ds_order_items(*)").order("id", { ascending: false }).limit(300),
      supabase.from("ds_products").select(PRODUCT_SELECT).order("created_at", { ascending: false }),
      supabase.from("ds_withdrawals").select("*").order("id", { ascending: false }).limit(200),
      supabase.from("ds_settings").select("*").eq("id", 1).maybeSingle()
    ]);
    setPartners((p.data ?? []) as DsPartner[]);
    setOrders((o.data ?? []) as DsOrder[]);
    setProds((g.data ?? []) as unknown as DsProduct[]);
    setWds((w.data ?? []) as DsWithdrawal[]);
    if (s.data) setSettings(s.data as DsSettings);
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
      showToast(dsErr(e), "error");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function db(r: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await r;
    if (error) throw error;
  }

  async function search() {
    const t = q.trim();
    if (t.length < 2) return showToast("কমপক্ষে ২ অক্ষর লিখুন", "error");
    const safe = t.replace(/[%,()]/g, " ");
    const { data } = await supabase.from("products").select("id,name_bn,name_en,current_price").or(`name_bn.ilike.%${safe}%,name_en.ilike.%${safe}%`).limit(20);
    setFound((data ?? []) as ShopProd[]);
  }

  const shown = useMemo(() => orders.filter((o) => filter === "all" || o.status === filter), [orders, filter]);
  const cnt = (s: string) => orders.filter((o) => o.status === s).length;
  const owed = partners.reduce((s, p) => s + Number(p.balance), 0);

  return (
    <div className="max-w-2xl">
      <h1 className="font-extrabold text-lg mb-3 flex items-center gap-2">
        <Truck size={20} className="text-teal" /> ড্রপশিপিং
      </h1>
      <div className="flex gap-1 overflow-x-auto bg-teal-tint p-1 rounded-xl mb-3">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`press shrink-0 text-xs font-bold px-3 py-2 rounded-lg ${tab === t.k ? "bg-white text-teal-dark shadow" : "text-teal-dark/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "p" && (
        <>
          <div className={card + " text-xs"}>
            ড্রপশিপার: {partners.length} · আবেদন পেন্ডিং: {partners.filter((p) => p.status === "Pending").length} · পেন্ডিং অর্ডার: {cnt("Pending")} · ড্রপশিপারদের মোট ব্যালেন্স (আপনার দেনা): <b>{tk(owed)}</b>
          </div>
          {partners.length === 0 && <div className="text-xs text-mute text-center py-6">এখনো কোনো আবেদন নেই। কাস্টমাররা /dropshipper পাতা থেকে আবেদন করবে।</div>}
          {partners.map((p) => (
            <div key={p.id} className={card}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-sm">
                  {p.name} <span className="text-mute font-normal text-xs">· {p.mobile} · কোড {p.code}</span>
                </span>
                <Pill s={p.status} />
              </div>
              <div className="text-[11px] text-mute mt-1">
                ব্যালেন্স {tk(p.balance)} · অর্ডার {orders.filter((o) => o.partner_id === p.id).length}টি
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <button className={btn} disabled={busy || p.status === "Approved"} onClick={() => run(() => dsRpc("ds_admin_set_partner_status", { p_id: p.id, p_status: "Approved" }), "অনুমোদিত")}>অনুমোদন</button>
                <button className={btnRed} disabled={busy || p.status === "Rejected"} onClick={() => run(() => dsRpc("ds_admin_set_partner_status", { p_id: p.id, p_status: "Rejected" }), "বাতিল")}>বাতিল</button>
                <button className={btnGhost} disabled={busy || p.status === "Suspended"} onClick={() => run(() => dsRpc("ds_admin_set_partner_status", { p_id: p.id, p_status: "Suspended" }), "সাসপেন্ড")}>সাসপেন্ড</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "o" && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1">
            {["all", "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled", "Returned"].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`press shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${filter === s ? "bg-teal text-white" : "bg-teal-tint text-teal-dark"}`}>
                {s === "all" ? `সব (${orders.length})` : `${DS_STATUS_BN[s as DsOrderStatus]} (${cnt(s)})`}
              </button>
            ))}
          </div>
          {shown.length === 0 && <div className="text-xs text-mute text-center py-6">কোনো অর্ডার নেই</div>}
          {shown.map((o) => (
            <div key={o.id} className={card}>
              <button className="w-full text-left" onClick={() => setOpenId(openId === o.id ? null : o.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-xs">
                    <div className="font-extrabold text-sm">{o.order_no}</div>
                    <div>{o.customer_name} · {o.customer_mobile}</div>
                    <div className="text-mute">
                      ড্রপশিপার: {nameOf(o.partner_id)} · {o.source === "link" ? "লিংক" : "ফর্ম"} · {fmtDT(o.created_at)}
                    </div>
                  </div>
                  <Pill s={o.status} label={DS_STATUS_BN[o.status]} />
                </div>
                <div className="text-xs mt-1">
                  কাস্টমারের কাছ থেকে নেবেন: <b>{tk(Number(o.subtotal) + Number(o.delivery_charge))}</b> · ড্রপশিপারের লাভ: <b>{tk(o.profit)}</b>
                </div>
              </button>
              {openId === o.id && (
                <div className="mt-3 pt-3 border-t border-border text-xs">
                  <div className="mb-2"><b>ঠিকানা:</b> {o.address}</div>
                  {o.note && <div className="mb-2"><b>কাস্টমারের নোট:</b> {o.note}</div>}
                  <div className="mb-2">
                    {(o.ds_order_items ?? []).map((it) => (
                      <div key={it.id} className="py-1 border-b border-border last:border-0">
                        {it.product_name}{it.variant_note ? ` (${it.variant_note})` : ""} × {it.qty}
                        <br />
                        <span className="text-mute">পাইকারি {tk(it.wholesale)} · বিক্রয় {tk(it.sell)} প্রতি পিস</span>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3 text-mute">
                    পণ্যের পাইকারি মোট {tk(o.wholesale_total)} + ডেলিভারি {tk(o.delivery_charge)} · ডেলিভারি হলে ড্রপশিপারকে দেবেন {tk(o.profit)}
                  </div>
                  {o.admin_note && <div className="mb-2"><b>আপনার নোট:</b> {o.admin_note}</div>}
                  {NEXT[o.status] ? (
                    <>
                      <input className="input mb-2" placeholder="নোট (ঐচ্ছিক)" value={notes[o.id] ?? ""} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} />
                      <div className="flex flex-wrap gap-2">
                        {NEXT[o.status].map((n) => (
                          <button
                            key={n.to}
                            className={n.red ? btnRed : btn}
                            disabled={busy}
                            onClick={() => (!n.red || window.confirm("নিশ্চিত?")) && run(() => dsRpc("ds_admin_set_order_status", { p_id: o.id, p_status: n.to, p_note: notes[o.id] ?? "" }), DS_STATUS_BN[n.to])}
                          >
                            {n.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-mute">এই অর্ডার চূড়ান্ত হয়ে গেছে।{o.profit_credited ? " লাভ জমা হয়েছে।" : ""}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "g" && (
        <>
          <div className={card}>
            <div className="font-extrabold text-sm mb-2">শপের পণ্য থেকে ড্রপশিপিংয়ে যোগ করুন</div>
            <div className="flex gap-2 mb-2">
              <input className="input" placeholder="পণ্যের নাম খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
              <button className={btn} onClick={search}>খুঁজুন</button>
            </div>
            {found.map((f) => {
              const already = prods.some((p) => p.product_id === f.id);
              return (
                <div key={f.id} className="py-2 border-t border-border text-xs">
                  <div className="font-bold">{f.name_bn || f.name_en}</div>
                  <div className="text-mute mb-1">শপের দাম {tk(f.current_price)}</div>
                  {already ? (
                    <div className="text-teal-dark font-bold">যোগ করা আছে</div>
                  ) : (
                    <div className="flex gap-2">
                      <input className="input" type="number" inputMode="decimal" placeholder="পাইকারি দাম ৳" value={wh[f.id] ?? ""} onChange={(e) => setWh({ ...wh, [f.id]: e.target.value })} />
                      <button
                        className={btn}
                        disabled={busy || !(Number(wh[f.id]) > 0)}
                        onClick={() => run(() => db(supabase.from("ds_products").insert({ product_id: f.id, wholesale: Number(wh[f.id]) })), "যোগ হয়েছে")}
                      >
                        যোগ
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {prods.map((p) => {
            const img = productImage(p);
            return (
              <div key={p.product_id} className={card}>
                <div className="flex items-center gap-3">
                  {img ? <img src={img} alt="" className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" /> : <div className="w-12 h-12 rounded-xl bg-teal-tint shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm leading-snug">{productTitle(p)}</div>
                    <div className="text-xs text-mute">
                      শপের দাম {tk(p.products?.current_price ?? 0)} · পাইকারি <b className="text-ink">{tk(p.wholesale)}</b> · {p.is_active ? "চালু" : "বন্ধ"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <input className="input" type="number" inputMode="decimal" placeholder="নতুন পাইকারি দাম" value={wh[p.product_id] ?? ""} onChange={(e) => setWh({ ...wh, [p.product_id]: e.target.value })} />
                  <button
                    className={btn}
                    disabled={busy || !(Number(wh[p.product_id]) > 0)}
                    onClick={async () => {
                      const ok = await run(() => db(supabase.from("ds_products").update({ wholesale: Number(wh[p.product_id]) }).eq("product_id", p.product_id)), "দাম বদলানো হয়েছে");
                      if (ok) setWh({ ...wh, [p.product_id]: "" });
                    }}
                  >
                    সংরক্ষণ
                  </button>
                  <button className={btnGhost} disabled={busy} onClick={() => run(() => db(supabase.from("ds_products").update({ is_active: !p.is_active }).eq("product_id", p.product_id)), p.is_active ? "বন্ধ" : "চালু")}>
                    {p.is_active ? "বন্ধ করুন" : "চালু করুন"}
                  </button>
                </div>
                <div className="text-[11px] text-mute mt-1">দাম বদলালে আগের অর্ডারের হিসাব বদলায় না। যেসব ড্রপশিপারের বিক্রয়মূল্য নতুন পাইকারি দামের নিচে, তারা পরের অর্ডারে লোকসান করতে পারে, তাই বাড়ালে জানিয়ে দিন।</div>
              </div>
            );
          })}
        </>
      )}

      {tab === "w" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-2">টাকা তোলার অনুরোধ</div>
          {wds.length === 0 && <div className="text-xs text-mute">নেই</div>}
          {wds.map((w) => (
            <div key={w.id} className="py-2.5 border-b border-border last:border-0 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span>
                  W{w.id} · {nameOf(w.partner_id)}
                  <br />
                  <b className="text-[13px]">{w.method} {w.account}</b> · <b>{tk(w.amount)}</b>
                  <br />
                  <span className="text-mute">{fmtDT(w.created_at)}{w.note ? ` · ${w.note}` : ""}</span>
                </span>
                <Pill s={w.status} />
              </div>
              {w.status === "Pending" && (
                <div className="mt-2">
                  <input className="input mb-2" placeholder="পাঠানোর ট্রানজেকশন রেফারেন্স (পরিশোধের জন্য লাগবে)" value={wRef[w.id] ?? ""} onChange={(e) => setWRef({ ...wRef, [w.id]: e.target.value })} />
                  <div className="flex gap-2">
                    <button className={btn} disabled={busy} onClick={() => run(() => dsRpc("ds_admin_decide_withdrawal", { p_id: w.id, p_approve: true, p_note: wRef[w.id] ?? "" }), "পরিশোধ হয়েছে")}>পরিশোধ হয়েছে</button>
                    <button className={btnRed} disabled={busy} onClick={() => window.confirm("বাতিল করে টাকা ফেরত দেবেন?") && run(() => dsRpc("ds_admin_decide_withdrawal", { p_id: w.id, p_approve: false, p_note: wRef[w.id] ?? "বাতিল" }), "বাতিল, টাকা ফেরত")}>বাতিল+ফেরত</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "s" && (
        <div className={card}>
          <div className="font-extrabold text-sm mb-2">ড্রপশিপিং সেটিংস</div>
          <label className="flex items-center gap-2 text-xs mb-3">
            <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} />
            ড্রপশিপিং চালু (বন্ধ করলে নতুন অর্ডার নেওয়া যাবে না)
          </label>
          <label className="text-xs font-bold text-mute block mb-1">ডেলিভারি চার্জ (৳, প্রতি অর্ডারে কাস্টমার দেবে)</label>
          <input className="input mb-2" type="number" value={settings.delivery_charge} onChange={(e) => setSettings({ ...settings, delivery_charge: Number(e.target.value) })} />
          <label className="text-xs font-bold text-mute block mb-1">সর্বনিম্ন টাকা তোলার পরিমাণ (৳)</label>
          <input className="input mb-2" type="number" value={settings.min_withdraw} onChange={(e) => setSettings({ ...settings, min_withdraw: Number(e.target.value) })} />
          <label className="text-xs font-bold text-mute block mb-1">ড্রপশিপারদের নোটিশ</label>
          <textarea className="input mb-2" rows={2} value={settings.notice} onChange={(e) => setSettings({ ...settings, notice: e.target.value })} />
          <label className="text-xs font-bold text-mute block mb-1">টাকা তোলার নির্দেশনা</label>
          <textarea className="input mb-3" rows={2} value={settings.withdraw_note} onChange={(e) => setSettings({ ...settings, withdraw_note: e.target.value })} />
          <button
            className={btn}
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  db(
                    supabase
                      .from("ds_settings")
                      .update({
                        enabled: settings.enabled,
                        delivery_charge: Math.max(0, Number(settings.delivery_charge) || 0),
                        min_withdraw: Math.max(0, Number(settings.min_withdraw) || 0),
                        notice: settings.notice,
                        withdraw_note: settings.withdraw_note
                      })
                      .eq("id", 1)
                  ),
                "সংরক্ষিত"
              )
            }
          >
            সংরক্ষণ
          </button>
        </div>
      )}
    </div>
  );
}
