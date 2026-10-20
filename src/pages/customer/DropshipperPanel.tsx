import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Box, ChartNoAxesCombined, Package, Search, Share2, ShoppingBag, Wallet } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import {
  DS_STATUS_BN,
  DsLedger,
  DsMy,
  DsOrder,
  DsPartner,
  DsProduct,
  DsSettings,
  DsWithdrawal,
  PRODUCT_SELECT,
  copyText,
  dsErr,
  dsRpc,
  fmtDT,
  productImage,
  productTitle,
  shareLink,
  statusClass,
  tk
} from "../../services/dropshipService";

type Tab = "products" | "mine" | "order" | "orders" | "earn";
const TABS: { k: Tab; label: string }[] = [
  { k: "products", label: "Products" },
  { k: "mine", label: "My Products" },
  { k: "order", label: "নতুন অর্ডার" },
  { k: "orders", label: "My Orders" },
  { k: "earn", label: "Earnings" }
];

const box = "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm";
const inp = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500";
const btnG = "rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60";
const btnL = "rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60";

interface Line {
  product_id: string;
  qty: string;
  variant: string;
}

export default function DropshipperPanel() {
  const { showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [logged, setLogged] = useState(false);
  const [me, setMe] = useState<DsPartner | null>(null);
  const [settings, setSettings] = useState<DsSettings | null>(null);
  const [products, setProducts] = useState<DsProduct[]>([]);
  const [mine, setMine] = useState<DsMy[]>([]);
  const [orders, setOrders] = useState<DsOrder[]>([]);
  const [ledger, setLedger] = useState<DsLedger[]>([]);
  const [wds, setWds] = useState<DsWithdrawal[]>([]);
  const [tab, setTab] = useState<Tab>("products");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  // আবেদন
  const [aName, setAName] = useState("");
  const [aMobile, setAMobile] = useState("");
  // নতুন অর্ডার
  const [lines, setLines] = useState<Line[]>([{ product_id: "", qty: "1", variant: "" }]);
  const [cName, setCName] = useState("");
  const [cMobile, setCMobile] = useState("");
  const [cAddr, setCAddr] = useState("");
  const [cNote, setCNote] = useState("");
  // টাকা তোলা
  const [wMethod, setWMethod] = useState("bKash");
  const [wAcc, setWAcc] = useState("");
  const [wAmt, setWAmt] = useState("");

  const load = useCallback(async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      setLogged(false);
      setReady(true);
      return;
    }
    setLogged(true);
    const { data: p } = await supabase.from("ds_partners").select("*").eq("user_id", session.user.id).maybeSingle();
    setMe((p as DsPartner) ?? null);
    if (p && (p as DsPartner).status === "Approved") {
      const pid = (p as DsPartner).id;
      const [s, pr, my, o, l, w] = await Promise.all([
        supabase.from("ds_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("ds_products").select(PRODUCT_SELECT).eq("is_active", true),
        supabase.from("ds_my_products").select("*").eq("partner_id", pid),
        supabase.from("ds_orders").select("*,ds_order_items(*)").eq("partner_id", pid).order("id", { ascending: false }).limit(100),
        supabase.from("ds_ledger").select("*").eq("partner_id", pid).order("id", { ascending: false }).limit(100),
        supabase.from("ds_withdrawals").select("*").eq("partner_id", pid).order("id", { ascending: false }).limit(50)
      ]);
      setSettings((s.data as DsSettings) ?? null);
      setProducts((pr.data ?? []) as unknown as DsProduct[]);
      setMine((my.data ?? []) as DsMy[]);
      setOrders((o.data ?? []) as DsOrder[]);
      setLedger((l.data ?? []) as DsLedger[]);
      setWds((w.data ?? []) as DsWithdrawal[]);
    }
    setReady(true);
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

  const myMap = useMemo(() => {
    const m: Record<string, number> = {};
    mine.forEach((x) => (m[x.product_id] = Number(x.sell_price)));
    return m;
  }, [mine]);
  const prodMap = useMemo(() => {
    const m: Record<string, DsProduct> = {};
    products.forEach((x) => (m[x.product_id] = x));
    return m;
  }, [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => !q || productTitle(p).toLowerCase().includes(q));
  }, [products, search]);
  const myProducts = products.filter((p) => myMap[p.product_id] != null);

  const live = orders.filter((o) => ["Pending", "Confirmed", "Shipped"].includes(o.status));
  const delivered = orders.filter((o) => o.status === "Delivered");
  const pendingProfit = live.reduce((s, o) => s + Number(o.profit), 0);
  const deliveredSales = delivered.reduce((s, o) => s + Number(o.subtotal), 0);

  async function share(p: DsProduct) {
    if (!me) return;
    const ok = await copyText(shareLink(me.code, p.product_id));
    showToast(ok ? "লিংক কপি হয়েছে" : "কপি করা গেল না", ok ? "success" : "error");
  }

  // নতুন অর্ডারের হিসাব
  const calc = useMemo(() => {
    let sub = 0;
    let profit = 0;
    lines.forEach((l) => {
      const p = prodMap[l.product_id];
      const q = Math.max(0, Math.floor(Number(l.qty) || 0));
      if (p && myMap[l.product_id] != null) {
        sub += myMap[l.product_id] * q;
        profit += (myMap[l.product_id] - Number(p.wholesale)) * q;
      }
    });
    return { sub, profit, total: sub + Number(settings?.delivery_charge ?? 0) };
  }, [lines, prodMap, myMap, settings]);

  async function submitOrder() {
    const items = lines
      .filter((l) => l.product_id)
      .map((l) => ({ product_id: l.product_id, qty: Math.floor(Number(l.qty) || 0), variant_note: l.variant.trim() }));
    const ok = await run(
      () => dsRpc("ds_place_order", { p_items: items, p_name: cName, p_mobile: cMobile, p_address: cAddr, p_note: cNote }),
      "অর্ডার জমা হয়েছে"
    );
    if (ok) {
      setLines([{ product_id: "", qty: "1", variant: "" }]);
      setCName("");
      setCMobile("");
      setCAddr("");
      setCNote("");
      setTab("orders");
    }
  }

  if (!ready) return <div className="p-8 text-center text-sm text-slate-500">লোড হচ্ছে…</div>;

  const hero = (status: string) => (
    <div className="mb-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-800 to-emerald-800 p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <BadgeCheck size={14} /> DROPSHIPPER
          </div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Dropshipper Panel</h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">J H Online SHOP-এর পণ্য নিজের দামে বিক্রি করুন, অর্ডার ট্র্যাক করুন এবং লাভ তুলুন।</p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
          <p className="text-xs text-white/70">Account status</p>
          <p className="mt-1 font-bold text-amber-200">{status}</p>
          {me?.status === "Approved" && <p className="mt-1 text-xs text-white/70">আপনার কোড: <b className="text-white">{me.code}</b></p>}
        </div>
      </div>
    </div>
  );

  const wrap = (c: React.ReactNode) => <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{c}</div>;

  if (!logged) {
    return wrap(
      <>
        {hero("লগইন দরকার")}
        <div className={box + " text-center"}>
          <p className="mb-4 text-sm text-slate-600">ড্রপশিপার হতে আগে আপনার মোবাইল নম্বর দিয়ে লগইন করুন।</p>
          <Link to="/account" className={btnG + " inline-block"}>
            লগইন / নতুন অ্যাকাউন্ট
          </Link>
        </div>
      </>
    );
  }

  if (!me) {
    return wrap(
      <>
        {hero("আবেদন করুন")}
        <div className={box + " max-w-md"}>
          <h2 className="mb-1 text-lg font-bold">ড্রপশিপার হওয়ার আবেদন</h2>
          <p className="mb-4 text-xs text-slate-500">অ্যাডমিন অনুমোদন দিলে পণ্য যোগ করা, শেয়ার লিংক ও অর্ডার দেওয়া চালু হবে।</p>
          <input className={inp + " mb-2"} placeholder="আপনার নাম" value={aName} onChange={(e) => setAName(e.target.value)} />
          <input className={inp + " mb-3"} inputMode="numeric" maxLength={11} placeholder="মোবাইল নম্বর 01XXXXXXXXX" value={aMobile} onChange={(e) => setAMobile(e.target.value.replace(/\D/g, ""))} />
          <button className={btnG + " w-full"} disabled={busy} onClick={() => run(() => dsRpc("ds_apply", { p_name: aName, p_mobile: aMobile }), "আবেদন জমা হয়েছে")}>
            আবেদন করুন
          </button>
        </div>
      </>
    );
  }

  if (me.status !== "Approved") {
    return wrap(
      <>
        {hero(me.status === "Pending" ? "অনুমোদনের অপেক্ষায়" : me.status === "Suspended" ? "সাময়িক বন্ধ" : "গ্রহণ করা হয়নি")}
        <div className={box + " text-center text-sm text-slate-600"}>
          {me.status === "Pending" && "আপনার আবেদন যাচাই চলছে। অনুমোদনের পর এখানে পণ্য ও অর্ডার দেখতে পাবেন।"}
          {me.status === "Rejected" && "আপনার আবেদন গ্রহণ করা হয়নি। যোগাযোগ করুন।"}
          {me.status === "Suspended" && "আপনার অ্যাকাউন্ট সাময়িক বন্ধ আছে। যোগাযোগ করুন।"}
        </div>
      </>
    );
  }

  const stats = [
    { label: "Total Orders", value: String(orders.length), icon: ShoppingBag },
    { label: "Delivered Sales", value: tk(deliveredSales), icon: ChartNoAxesCombined },
    { label: "Pending Profit", value: tk(pendingProfit), icon: Package },
    { label: "Balance", value: tk(me.balance), icon: Wallet }
  ];

  return wrap(
    <>
      {hero("Approved")}
      {settings?.notice && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">📢 {settings.notice}</div>}
      {settings && !settings.enabled && <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">ড্রপশিপিং এখন সাময়িক বন্ধ আছে। নতুন অর্ডার নেওয়া যাবে না।</div>}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Icon size={20} />
            </div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === t.k ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:bg-white/70"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Product Marketplace</h2>
              <p className="mt-1 text-sm text-slate-500">পাইকারি দামের ওপরে নিজের বিক্রয়মূল্য দিন। পার্থক্যটাই আপনার লাভ।</p>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:w-72">
              <Search size={17} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="পণ্য খুঁজুন..." className="w-full bg-transparent text-sm outline-none" />
            </label>
          </div>
          {visible.length === 0 && <p className="py-8 text-center text-sm text-slate-500">এখনো কোনো পণ্য ড্রপশিপিংয়ে যোগ করা হয়নি।</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((p) => {
              const img = productImage(p);
              const cur = myMap[p.product_id];
              const val = prices[p.product_id] ?? (cur != null ? String(cur) : "");
              const num = Number(val);
              const profit = num > 0 ? num - Number(p.wholesale) : null;
              return (
                <article key={p.product_id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="h-44 bg-slate-100">{img ? <img src={img} alt={productTitle(p)} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><Box size={36} /></div>}</div>
                  <div className="p-4">
                    <h3 className="min-h-10 text-sm font-bold text-slate-900">{productTitle(p)}</h3>
                    <p className="mt-2 text-xs text-slate-500">পাইকারি দাম</p>
                    <p className="text-lg font-extrabold">{tk(p.wholesale)}</p>
                    <label className="mt-2 block text-xs font-semibold text-slate-500">আপনার বিক্রয়মূল্য (৳)</label>
                    <input className={inp + " mt-1"} type="number" inputMode="decimal" placeholder={`কমপক্ষে ${p.wholesale}`} value={val} onChange={(e) => setPrices({ ...prices, [p.product_id]: e.target.value })} />
                    {profit !== null && <p className={`mt-1 text-xs font-bold ${profit < 0 ? "text-red-600" : "text-emerald-700"}`}>{profit < 0 ? "দাম পাইকারির চেয়ে কম" : `প্রতি পিসে লাভ ${tk(profit)}`}</p>}
                    <button
                      disabled={busy || !(num > 0)}
                      onClick={() => run(() => dsRpc("ds_set_my_product", { p_product: p.product_id, p_sell: num }), cur != null ? "দাম বদলানো হয়েছে" : "My Products-এ যোগ হয়েছে")}
                      className={`mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-bold disabled:opacity-60 ${cur != null ? "bg-emerald-50 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                    >
                      {cur != null ? "✓ যোগ করা আছে (দাম বদলান)" : "+ Add Product"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {tab === "mine" && (
        <section className={box}>
          <h2 className="mb-4 text-xl font-bold">My Products</h2>
          {myProducts.length === 0 ? (
            <p className="text-sm text-slate-500">এখনও কোনো পণ্য যোগ করেননি। Products ট্যাব থেকে পণ্য ও দাম দিন।</p>
          ) : (
            myProducts.map((p) => (
              <div key={p.product_id} className="flex flex-wrap items-center justify-between gap-2 border-b py-3 last:border-0">
                <div className="min-w-0">
                  <p className="font-semibold">{productTitle(p)}</p>
                  <p className="text-sm text-slate-500">
                    বিক্রয় {tk(myMap[p.product_id])} · লাভ <b className="text-emerald-700">{tk(myMap[p.product_id] - Number(p.wholesale))}</b>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => share(p)} className={btnL + " flex items-center gap-1"}>
                    <Share2 size={14} /> লিংক কপি
                  </button>
                  <button
                    onClick={() => {
                      setLines([{ product_id: p.product_id, qty: "1", variant: "" }]);
                      setTab("order");
                    }}
                    className={btnL}
                  >
                    অর্ডার দিন
                  </button>
                  <button disabled={busy} onClick={() => run(() => dsRpc("ds_set_my_product", { p_product: p.product_id, p_sell: null }), "সরানো হয়েছে")} className={btnL + " text-red-600"}>
                    সরান
                  </button>
                </div>
              </div>
            ))
          )}
          <p className="mt-4 text-xs text-slate-500">শেয়ার লিংক খুলে কাস্টমার নিজে নাম ঠিকানা দিয়ে অর্ডার করতে পারবে। অর্ডার আপনার নামে জমা হবে।</p>
        </section>
      )}

      {tab === "order" && (
        <section className={box}>
          <h2 className="mb-1 text-xl font-bold">কাস্টমারের জন্য অর্ডার</h2>
          <p className="mb-4 text-sm text-slate-500">ক্যাশ অন ডেলিভারি। কাস্টমারের কাছ থেকে আপনার বিক্রয়মূল্য ও ডেলিভারি চার্জ নেওয়া হবে।</p>
          {myProducts.length === 0 ? (
            <p className="text-sm text-slate-500">আগে Products ট্যাব থেকে পণ্য যোগ করুন।</p>
          ) : (
            <>
              {lines.map((l, i) => (
                <div key={i} className="mb-3 grid grid-cols-6 gap-2">
                  <select className={inp + " col-span-6 sm:col-span-3"} value={l.product_id} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, product_id: e.target.value } : x)))}>
                    <option value="">পণ্য বেছে নিন</option>
                    {myProducts.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {productTitle(p)} — {tk(myMap[p.product_id])}
                      </option>
                    ))}
                  </select>
                  <input className={inp + " col-span-2 sm:col-span-1"} type="number" inputMode="numeric" min={1} max={50} placeholder="পরিমাণ" value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
                  <input className={inp + " col-span-3 sm:col-span-2"} placeholder="সাইজ/কালার" value={l.variant} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, variant: e.target.value } : x)))} />
                  <button className="col-span-1 text-xs text-red-600 sm:col-span-0" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : lines)}>
                    ✕
                  </button>
                </div>
              ))}
              <button className={btnL + " mb-4"} onClick={() => setLines([...lines, { product_id: "", qty: "1", variant: "" }])}>
                + আরেকটা পণ্য
              </button>
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={inp} placeholder="কাস্টমারের নাম" value={cName} onChange={(e) => setCName(e.target.value)} />
                <input className={inp} inputMode="numeric" maxLength={11} placeholder="কাস্টমারের মোবাইল" value={cMobile} onChange={(e) => setCMobile(e.target.value.replace(/\D/g, ""))} />
              </div>
              <textarea className={inp + " mt-2"} rows={2} placeholder="পুরো ঠিকানা (গ্রাম/এলাকা, থানা, জেলা)" value={cAddr} onChange={(e) => setCAddr(e.target.value)} />
              <input className={inp + " mt-2"} placeholder="নোট (ঐচ্ছিক)" value={cNote} onChange={(e) => setCNote(e.target.value)} />
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex justify-between"><span>পণ্যের দাম</span><b>{tk(calc.sub)}</b></div>
                <div className="flex justify-between"><span>ডেলিভারি চার্জ</span><b>{tk(settings?.delivery_charge ?? 0)}</b></div>
                <div className="flex justify-between border-t pt-1 mt-1"><span>কাস্টমার দেবে</span><b>{tk(calc.total)}</b></div>
                <div className="flex justify-between text-emerald-700"><span>আপনার লাভ (ডেলিভারির পর)</span><b>{tk(calc.profit)}</b></div>
              </div>
              <button className={btnG + " mt-4 w-full"} disabled={busy || !settings?.enabled} onClick={submitOrder}>
                অর্ডার জমা দিন
              </button>
            </>
          )}
        </section>
      )}

      {tab === "orders" && (
        <section className={box}>
          <h2 className="mb-4 text-xl font-bold">My Orders</h2>
          {orders.length === 0 && <p className="text-sm text-slate-500">এখনো কোনো অর্ডার নেই।</p>}
          {orders.map((o) => (
            <div key={o.id} className="border-b py-3 text-sm last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{o.order_no} <span className="text-xs font-normal text-slate-500">· {o.source === "link" ? "লিংক থেকে" : "আপনার দেওয়া"}</span></p>
                  <p className="text-slate-600">{o.customer_name} · {o.customer_mobile}</p>
                  <p className="text-xs text-slate-500">{fmtDT(o.created_at)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${statusClass(o.status)}`}>{DS_STATUS_BN[o.status]}</span>
              </div>
              <ul className="mt-2 text-xs text-slate-600">
                {(o.ds_order_items ?? []).map((it) => (
                  <li key={it.id}>
                    {it.product_name}{it.variant_note ? ` (${it.variant_note})` : ""} × {it.qty} = {tk(it.sell * it.qty)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                কাস্টমার দেবে <b>{tk(Number(o.subtotal) + Number(o.delivery_charge))}</b> · লাভ{" "}
                <b className={o.status === "Delivered" ? "text-emerald-700" : "text-slate-700"}>{tk(o.profit)}</b>
                {o.status === "Delivered" ? " (জমা হয়েছে)" : o.status === "Cancelled" || o.status === "Returned" ? " (পাবেন না)" : " (ডেলিভারির পর)"}
              </p>
              {o.admin_note && <p className="mt-1 text-xs text-slate-500">নোট: {o.admin_note}</p>}
            </div>
          ))}
        </section>
      )}

      {tab === "earn" && (
        <>
          <section className={box + " mb-4"}>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Wallet /></div>
              <div>
                <p className="text-sm text-slate-500">Available balance</p>
                <p className="text-3xl font-extrabold">{tk(me.balance)}</p>
              </div>
            </div>
            <h3 className="mb-2 mt-5 font-bold">টাকা তোলার অনুরোধ</h3>
            <p className="mb-3 text-xs text-slate-500">সর্বনিম্ন {tk(settings?.min_withdraw ?? 0)}। অনুরোধ করলেই টাকা ব্যালেন্স থেকে আটকে যাবে। বাতিল হলে ফেরত আসবে।</p>
            {settings?.withdraw_note && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{settings.withdraw_note}</p>}
            <div className="grid gap-2 sm:grid-cols-3">
              <select className={inp} value={wMethod} onChange={(e) => setWMethod(e.target.value)}>
                <option>bKash</option>
                <option>Nagad</option>
                <option>Rocket</option>
              </select>
              <input className={inp} inputMode="numeric" maxLength={11} placeholder="নম্বর 01XXXXXXXXX" value={wAcc} onChange={(e) => setWAcc(e.target.value.replace(/\D/g, ""))} />
              <input className={inp} type="number" inputMode="decimal" placeholder="পরিমাণ ৳" value={wAmt} onChange={(e) => setWAmt(e.target.value)} />
            </div>
            <button
              className={btnG + " mt-3"}
              disabled={busy}
              onClick={async () => {
                const ok = await run(() => dsRpc("ds_request_withdrawal", { p_method: wMethod, p_account: wAcc, p_amount: Number(wAmt) }), "অনুরোধ জমা হয়েছে");
                if (ok) {
                  setWAcc("");
                  setWAmt("");
                }
              }}
            >
              Request Withdrawal
            </button>
          </section>

          <section className={box + " mb-4"}>
            <h3 className="mb-2 font-bold">উত্তোলনের অনুরোধ</h3>
            {wds.length === 0 && <p className="text-sm text-slate-500">নেই</p>}
            {wds.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
                <span>
                  W{w.id} · {w.method} {w.account}
                  <br />
                  <span className="text-xs text-slate-500">{tk(w.amount)} · {fmtDT(w.created_at)}{w.note ? ` · ${w.note}` : ""}</span>
                </span>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(w.status)}`}>{w.status}</span>
              </div>
            ))}
          </section>

          <section className={box}>
            <h3 className="mb-2 font-bold">লেনদেনের খাতা</h3>
            {ledger.length === 0 && <p className="text-sm text-slate-500">নেই</p>}
            {ledger.map((l) => (
              <div key={l.id} className="flex items-start justify-between gap-2 border-b py-2 text-sm last:border-0">
                <span>
                  <b>{l.type === "Profit" ? "লাভ জমা" : l.type === "Withdraw hold" ? "উত্তোলন (আটকানো)" : l.type === "Withdraw refund" ? "উত্তোলন ফেরত" : l.type}</b>
                  <br />
                  <span className="text-xs text-slate-500">{l.ref} {l.note} · {fmtDT(l.created_at)}</span>
                </span>
                <span className="text-right">
                  <b className={l.amount < 0 ? "text-red-600" : "text-emerald-700"}>{l.amount < 0 ? "−" : "+"}{tk(Math.abs(l.amount))}</b>
                  <br />
                  <span className="text-xs text-slate-500">ব্যালেন্স {tk(l.balance_after)}</span>
                </span>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
