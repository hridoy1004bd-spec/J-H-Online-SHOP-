import React, { useCallback, useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { tk } from "../../services/dropshipService";
import { platErr, rpc, fmtDate } from "../../services/platformService";
import { CourierBooking, CourierSettings, courierBook, courierSettings, courierSync } from "../../services/courierService";

const card = "bg-white border border-border rounded-2xl p-4 mb-3";
const btn = "press bg-teal text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";
const btnGhost = "press bg-teal-tint text-teal-dark font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-60";

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_mobile: string | null;
  city: string | null;
  total: number;
  paid_amount: number | null;
  payment_status: string;
}
interface Event {
  id: number;
  order_id: string | null;
  kind: string;
  message: string | null;
  created_at: string;
}

type Tab = "queue" | "booked" | "settings";

export default function AdminCourier() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("queue");
  const [set, setSet] = useState<(CourierSettings & { ok: boolean }) | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [bookings, setBookings] = useState<CourierBooking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [o, b, e] = await Promise.all([
      supabase.from("orders").select("id,order_number,customer_name,customer_mobile,city,total,paid_amount,payment_status").eq("status", "confirmed").order("created_at", { ascending: false }),
      supabase.from("courier_bookings").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase.from("courier_events").select("*").order("created_at", { ascending: false }).limit(20)
    ]);
    const bk = (b.data as CourierBooking[]) ?? [];
    setBookings(bk);
    setEvents((e.data as Event[]) ?? []);
    setOrders(((o.data as OrderRow[]) ?? []));
    const ids = bk.map((x) => x.order_id);
    if (ids.length) {
      const { data } = await supabase.from("orders").select("id,order_number").in("id", ids);
      const m: Record<string, string> = {};
      (data ?? []).forEach((r: { id: string; order_number: string }) => (m[r.id] = r.order_number));
      setNumbers(m);
    }
    try {
      setSet(await courierSettings());
    } catch {
      /* ফাংশন না থাকলে */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bookedIds = new Set(bookings.filter((b) => b.status !== "failed").map((b) => b.order_id));
  const queue = orders.filter((o) => !bookedIds.has(o.id));
  const failed = bookings.filter((b) => b.status === "failed");

  async function book(id: string) {
    setBusy(id);
    try {
      await courierBook(id);
      showToast("কুরিয়ারে বুক হয়েছে ✓");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
    setBusy(null);
    load();
  }
  async function sync() {
    setBusy("sync");
    try {
      const r = await courierSync();
      showToast(`${r.checked}টি দেখা হয়েছে, ${r.updated}টি আপডেট`);
    } catch (e) {
      showToast((e as Error).message, "error");
    }
    setBusy(null);
    load();
  }
  async function saveSettings(mode: string, provider: string) {
    try {
      await rpc("courier_admin_set_settings", { p_mode: mode, p_provider: provider });
      showToast("সেভ হয়েছে ✓");
      load();
    } catch (e) {
      showToast(platErr(e), "error");
    }
  }

  const cod = (o: OrderRow) => (o.payment_status === "paid" ? 0 : Math.max(Number(o.total) - Number(o.paid_amount ?? 0), 0));

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-lg font-extrabold mb-1 flex items-center gap-2"><Truck size={20} /> কুরিয়ার</h1>
      <p className="text-xs text-mute mb-3">
        মোড: <b>{set?.mode === "auto" ? "অটো (কনফার্ম করলেই বুক)" : "ম্যানুয়াল"}</b> · Steadfast:{" "}
        <b className={set?.steadfast_configured ? "text-green-700" : "text-red-600"}>{set?.steadfast_configured ? "Key সেট আছে" : "Key সেট নেই"}</b>
      </p>

      {failed.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-3 text-xs text-red-700">
          <b>⚠ {failed.length}টি বুকিং ব্যর্থ</b> — নিচে "ব্যর্থ" দেখে আবার চেষ্টা করুন।
        </div>
      )}

      <div className="flex gap-2 mb-3">
        {([["queue", `কনফার্ম (${queue.length})`], ["booked", "বুকিং"], ["settings", "সেটিংস"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={tab === k ? btn : btnGhost}>{l}</button>
        ))}
      </div>

      {tab === "queue" && (
        <>
          {queue.length === 0 && <div className={card + " text-sm text-mute"}>কুরিয়ারে পাঠানোর মতো কনফার্ম অর্ডার নেই।</div>}
          {queue.map((o) => (
            <div key={o.id} className={card}>
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-bold text-sm">{o.order_number}</div>
                  <div className="text-xs text-mute">{o.customer_name} · {o.customer_mobile} · {o.city}</div>
                  <div className="text-xs mt-1">COD: <b>{tk(cod(o))}</b></div>
                </div>
                <button className={btn} disabled={busy === o.id} onClick={() => book(o.id)}>{busy === o.id ? "..." : "কুরিয়ারে পাঠান"}</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "booked" && (
        <>
          <button className={btnGhost + " mb-3"} disabled={busy === "sync"} onClick={sync}>{busy === "sync" ? "..." : "ট্র্যাকিং আপডেট করুন"}</button>
          {bookings.length === 0 && <div className={card + " text-sm text-mute"}>এখনো কোনো বুকিং নেই।</div>}
          {bookings.map((b) => (
            <div key={b.id} className={card}>
              <div className="flex justify-between gap-2 items-start">
                <div>
                  <div className="font-bold text-sm">{numbers[b.order_id] ?? b.order_id.slice(0, 8)}</div>
                  <div className="text-xs text-mute">{b.provider} · {fmtDate(b.updated_at)}</div>
                  {b.tracking_code && <div className="text-xs mt-1">ট্র্যাকিং: <b>{b.tracking_code}</b> · {b.delivery_status}</div>}
                  {b.status === "failed" && <div className="text-xs mt-1 text-red-600 break-all">{b.last_error}</div>}
                </div>
                <div className="text-right">
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${b.status === "booked" ? "bg-green-100 text-green-700" : b.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {b.status === "booked" ? "বুকড" : b.status === "failed" ? "ব্যর্থ" : "চলছে"}
                  </span>
                  {b.status === "failed" && (
                    <button className={btn + " block mt-2"} disabled={busy === b.order_id} onClick={() => book(b.order_id)}>আবার চেষ্টা</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {events.length > 0 && (
            <div className={card}>
              <div className="font-bold text-xs mb-2">সাম্প্রতিক এলার্ট</div>
              {events.map((e) => (
                <div key={e.id} className="text-[11px] text-mute border-t border-border py-1 break-all">{fmtDate(e.created_at)} · {e.kind}: {e.message}</div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "settings" && set && (
        <div className={card}>
          <label className="block text-[11px] font-bold text-mute mb-1">বুকিং মোড</label>
          <select className="input mb-3" value={set.mode} onChange={(e) => setSet({ ...set, mode: e.target.value as "manual" | "auto" })}>
            <option value="manual">ম্যানুয়াল — আমি নিজে "কুরিয়ারে পাঠান" চাপব</option>
            <option value="auto">অটো — অর্ডার কনফার্ম করলেই বুক</option>
          </select>
          <label className="block text-[11px] font-bold text-mute mb-1">কুরিয়ার</label>
          <select className="input mb-3" value={set.provider} onChange={(e) => setSet({ ...set, provider: e.target.value as CourierSettings["provider"] })}>
            <option value="steadfast">Steadfast (চালু)</option>
            <option value="pathao" disabled>Pathao (শীঘ্রই)</option>
            <option value="redx" disabled>REDX (শীঘ্রই)</option>
          </select>
          <button className={btn} onClick={() => saveSettings(set.mode, set.provider)}>সেভ</button>
          <p className="text-[11px] text-mute mt-3">API Key ব্রাউজারে রাখা হয় না। Supabase → Edge Functions → Secrets-এ STEADFAST_API_KEY ও STEADFAST_SECRET_KEY দিন।</p>
        </div>
      )}
    </div>
  );
}
