import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Phone, Calendar, KeyRound, Package, Plus, Minus, AlertTriangle } from "lucide-react";
import { supabase, FUNCTIONS_URL } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { LineSkeleton } from "../../components/LoadingSkeleton";
import { money, formatDate } from "../../utils/format";

interface CustomerInfo {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  created_at: string;
  auth_user_id: string | null;
}

interface OrderItemRow {
  id: string;
  product_name: string | null;
  product_name_snapshot: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unit_price: number | null;
  price_snapshot: number | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  order_items: OrderItemRow[];
}

interface DueRow {
  id: string;
  amount: number;
  paid: number;
  note: string | null;
  status: string;
  created_at: string;
}

interface TxRow {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [dues, setDues] = useState<DueRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [walletModal, setWalletModal] = useState<"add" | "sub" | null>(null);
  const [dueModal, setDueModal] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [sendNotice, setSendNotice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const { data: cust } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
      setCustomer(cust ?? null);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, order_number, total, status, payment_method, created_at, order_items(*)")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });
      setOrders((ordersData as unknown as OrderRow[]) ?? []);

      if (cust?.auth_user_id) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", cust.auth_user_id)
          .maybeSingle();
        setWalletBalance(Number(wallet?.balance ?? 0));

        const { data: txData } = await supabase
          .from("wallet_transactions")
          .select("id, type, amount, balance_after, description, created_at")
          .eq("user_id", cust.auth_user_id)
          .order("created_at", { ascending: false })
          .limit(10);
        setTxs((txData as TxRow[]) ?? []);
      }

      const { data: dueData } = await supabase
        .from("customer_dues")
        .select("id, amount, paid, note, status, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });
      setDues((dueData as DueRow[]) ?? []);

      setLoading(false);
    }
    load();
  }, [id, reloadKey]);

  function closeModals() {
    setWalletModal(null);
    setDueModal(false);
    setAmountInput("");
    setNoteInput("");
  }

  async function handleWalletAdjust() {
    if (!customer || !walletModal) return;
    const amt = Number(amountInput);
    if (!amt || amt <= 0) return showToast(lang === "en" ? "Enter a valid amount" : "সঠিক টাকার অংক দিন", "error");
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_adjust_wallet", {
      p_customer_id: customer.id,
      p_amount: walletModal === "add" ? amt : -amt,
      p_note: noteInput.trim() || null
    });
    setBusy(false);
    if (error || !data?.success) {
      const msg = data?.error === "Balance is not enough to deduct"
        ? "ওয়ালেটে এত টাকা নেই"
        : data?.error === "Customer has no login account yet"
        ? "এই কাস্টমারের এখনো লগইন অ্যাকাউন্ট নেই"
        : data?.error || error?.message || "ব্যর্থ হয়েছে";
      return showToast(msg, "error");
    }
    const ded = Number(data.due_deducted ?? 0);
    showToast(ded > 0 ? `সম্পন্ন ✓ (বকেয়া বাবদ ৳${ded} কাটা হয়েছে)` : "সম্পন্ন ✓", "success");
    closeModals();
    setReloadKey((k) => k + 1);
  }

  async function handleAddDue() {
    if (!customer) return;
    const amt = Number(amountInput);
    if (!amt || amt <= 0) return showToast(lang === "en" ? "Enter a valid amount" : "সঠিক টাকার অংক দিন", "error");
    setBusy(true);
    const { error } = await supabase.from("customer_dues").insert({
      customer_id: customer.id,
      amount: amt,
      note: noteInput.trim() || null
    });
    if (error) {
      setBusy(false);
      return showToast(error.message, "error");
    }
    if (sendNotice) {
      const reason = noteInput.trim() ? ` (${noteInput.trim()})` : "";
      await supabase.from("notifications").insert({
        customer_id: customer.id,
        type: "due_notice",
        title: "Outstanding due",
        body: `You have an outstanding due of TK ${amt}${reason}. It will be deducted automatically when you recharge or redeem a gift card.`,
        title_en: "Outstanding due",
        body_en: `You have an outstanding due of TK ${amt}${reason}. It will be deducted automatically when you recharge or redeem a gift card.`,
        title_bn: "আপনার বকেয়া আছে",
        body_bn: `আপনার ৳${amt} বকেয়া আছে${reason}। ওয়ালেটে টাকা যোগ বা গিফট কার্ড রিডিম করলে এটি নিজে থেকেই কেটে নেওয়া হবে।`
      });
    }
    setBusy(false);
    showToast("বকেয়া যোগ হয়েছে ✓", "success");
    closeModals();
    setReloadKey((k) => k + 1);
  }

  async function cancelDue(d: DueRow) {
    if (!confirm("এই বকেয়া বাতিল করবেন?")) return;
    const { error } = await supabase.from("customer_dues").update({ status: "cancelled", settled_at: new Date().toISOString() }).eq("id", d.id);
    if (error) return showToast(error.message, "error");
    showToast("বাতিল হয়েছে ✓", "success");
    setReloadKey((k) => k + 1);
  }

  async function handleResetPassword() {
    if (!customer) return;
    if (newPassword.length < 6) {
      showToast(lang === "en" ? "Password must be at least 6 characters" : "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে", "error");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      showToast(lang === "en" ? "Admin session not found" : "অ্যাডমিন সেশন পাওয়া যায়নি", "error");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/admin-set-customer-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mobile: customer.mobile, password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || (lang === "en" ? "Failed to reset password" : "পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে"), "error");
        return;
      }
      showToast(lang === "en" ? "Password reset successfully" : "পাসওয়ার্ড রিসেট হয়ে গেছে", "success");
      setShowResetModal(false);
      setNewPassword("");
    } catch {
      showToast(lang === "en" ? "Network error" : "নেটওয়ার্ক সমস্যা", "error");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <LineSkeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center text-sm text-mute pt-10">
        {lang === "en" ? "Customer not found" : "কাস্টমার পাওয়া যায়নি"}
      </div>
    );
  }

  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-mute font-semibold mb-3">
        <ArrowLeft size={16} /> {lang === "en" ? "Back" : "ফিরে যান"}
      </button>

      <div className="bg-teal rounded-2xl p-5 text-white mb-4">
        <div className="font-extrabold text-lg">{customer.name}</div>
        <div className="flex items-center gap-1.5 text-white/85 text-sm mt-1">
          <Phone size={14} /> {customer.mobile}
        </div>
        <div className="flex items-center gap-1.5 text-white/70 text-xs mt-1">
          <Calendar size={13} /> {lang === "en" ? "Joined" : "যোগদান"}: {formatDate(customer.created_at, lang)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs text-mute font-bold mb-1">
            <Wallet size={14} className="text-teal" /> {lang === "en" ? "Wallet Balance" : "ওয়ালেট ব্যালেন্স"}
          </div>
          <div className="text-lg font-extrabold text-teal-dark">{money(walletBalance)}</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs text-mute font-bold mb-1">
            <Package size={14} className="text-orange" /> {lang === "en" ? "Total Spent" : "মোট খরচ"}
          </div>
          <div className="text-lg font-extrabold text-ink">{money(totalSpent)}</div>
        </div>
      </div>

      {customer.auth_user_id ? (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={() => setWalletModal("add")}
            className="press flex items-center justify-center gap-1.5 bg-teal-tint text-teal-dark rounded-xl py-3 text-sm font-bold"
          >
            <Plus size={16} /> {lang === "en" ? "Add Balance" : "টাকা যোগ করুন"}
          </button>
          <button
            onClick={() => setWalletModal("sub")}
            className="press flex items-center justify-center gap-1.5 bg-red-50 text-red-600 rounded-xl py-3 text-sm font-bold"
          >
            <Minus size={16} /> {lang === "en" ? "Deduct Balance" : "টাকা কমান"}
          </button>
        </div>
      ) : (
        <div className="text-[11px] text-mute bg-white border border-border rounded-xl p-3 mb-3">
          এই কাস্টমারের এখনো লগইন অ্যাকাউন্ট নেই, তাই ওয়ালেটে টাকা যোগ/কমানো যাবে না। (বকেয়া লেখা যাবে।)
        </div>
      )}

      {/* বকেয়া */}
      {(() => {
        const open = dues.filter((d) => d.status === "open");
        const openTotal = open.reduce((s, d) => s + (Number(d.amount) - Number(d.paid)), 0);
        return (
          <div className="bg-white border border-border rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-mute">
                <AlertTriangle size={14} className={openTotal > 0 ? "text-red-500" : "text-mute"} /> বকেয়া
              </div>
              <div className={`text-sm font-extrabold ${openTotal > 0 ? "text-red-600" : "text-teal-dark"}`}>
                {openTotal > 0 ? money(openTotal) : "কোনো বকেয়া নেই"}
              </div>
            </div>
            {dues.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {dues.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 text-xs border-t border-border pt-1.5">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink/80 truncate">{d.note || "বকেয়া"}</div>
                      <div className="text-[10.5px] text-mute">
                        {formatDate(d.created_at, lang)} · ৳{Number(d.amount)}{Number(d.paid) > 0 ? ` (কাটা হয়েছে ৳${Number(d.paid)})` : ""}
                      </div>
                    </div>
                    {d.status === "open" ? (
                      <button onClick={() => cancelDue(d)} className="press shrink-0 text-[10.5px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">
                        বাতিল
                      </button>
                    ) : (
                      <span className="shrink-0 text-[10.5px] font-bold text-mute bg-gray-100 px-2 py-1 rounded-full">
                        {d.status === "settled" ? "পরিশোধ" : "বাতিল"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setDueModal(true)}
              className="press w-full bg-orange-tint text-orange text-sm font-bold py-2.5 rounded-xl"
            >
              + বকেয়া লিখুন ও নোটিশ দিন
            </button>
            <div className="text-[10.5px] text-mute mt-1.5">
              এই কাস্টমার ওয়ালেটে টাকা যোগ বা গিফট কার্ড রিডিম করলেই বকেয়া নিজে থেকে কেটে নেওয়া হবে।
            </div>
          </div>
        );
      })()}

      {txs.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-mute uppercase mb-2">ওয়ালেট লেনদেন (সর্বশেষ ১০টি)</div>
          <div className="bg-white border border-border rounded-xl divide-y divide-border">
            {txs.map((x) => {
              const minus = x.type === "purchase" || x.type === "admin_debit";
              return (
                <div key={x.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink/80 truncate">{x.description || x.type}</div>
                    <div className="text-[10.5px] text-mute">{formatDate(x.created_at, lang)}</div>
                  </div>
                  <div className={`shrink-0 text-sm font-extrabold ${minus ? "text-red-600" : "text-teal-dark"}`}>
                    {minus ? "−" : "+"}{money(x.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowResetModal(true)}
        className="press w-full flex items-center justify-center gap-2 bg-white border border-border rounded-xl py-3 mb-5 text-sm font-bold text-ink"
      >
        <KeyRound size={16} className="text-teal" />
        {lang === "en" ? "Reset Password" : "পাসওয়ার্ড রিসেট করুন"}
      </button>

      <div className="text-xs font-bold text-mute uppercase mb-2">
        {lang === "en" ? "Order History" : "অর্ডার হিস্টরি"} ({orders.length})
      </div>

      {orders.length === 0 ? (
        <div className="text-sm text-mute text-center py-8">
          {lang === "en" ? "No orders yet" : "এখনো কোনো অর্ডার নেই"}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-sm font-bold">{o.order_number}</div>
                <div className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-tint text-teal-dark capitalize">
                  {o.status}
                </div>
              </div>
              <div className="text-[11px] text-mute mb-2">{formatDate(o.created_at, lang)} · {o.payment_method}</div>
              <div className="space-y-1 mb-2">
                {(o.order_items ?? []).map((it) => (
                  <div key={it.id} className="text-xs text-ink/80 flex justify-between">
                    <span>
                      {it.product_name ?? it.product_name_snapshot ?? "Product"}
                      {it.size ? ` (${it.size})` : ""} × {it.quantity}
                    </span>
                    <span>{money(Number(it.unit_price ?? it.price_snapshot ?? 0) * it.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="text-sm font-extrabold text-teal-dark text-right border-t border-border pt-1.5">
                {money(o.total)}
              </div>
            </div>
          ))}
        </div>
      )}

      {(walletModal || dueModal) && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <div className="font-extrabold text-base mb-1">
              {walletModal === "add" ? "ওয়ালেটে টাকা যোগ করুন" : walletModal === "sub" ? "ওয়ালেট থেকে টাকা কমান" : "বকেয়া লিখুন"}
            </div>
            <div className="text-xs text-mute mb-4">
              {customer.name} — {customer.mobile}
              {walletModal ? ` · বর্তমান ব্যালেন্স ${money(walletBalance)}` : ""}
            </div>
            <input
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="টাকার পরিমাণ"
              className="input mb-3"
            />
            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder={dueModal ? "কারণ (যেমন: অর্ডার নিয়ে ডেলিভারি চার্জ দেয়নি)" : "নোট (ঐচ্ছিক)"}
              className="input mb-3"
            />
            {dueModal && (
              <label className="flex items-center gap-2 mb-3 text-xs font-semibold">
                <input type="checkbox" checked={sendNotice} onChange={(e) => setSendNotice(e.target.checked)} />
                কাস্টমারকে নোটিশ পাঠান
              </label>
            )}
            <div className="flex gap-2">
              <button onClick={closeModals} className="press flex-1 bg-gray-100 text-ink text-sm font-bold py-2.5 rounded-xl">
                {lang === "en" ? "Cancel" : "বাতিল"}
              </button>
              <button
                onClick={dueModal ? handleAddDue : handleWalletAdjust}
                disabled={busy}
                className="press flex-1 bg-teal text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
              >
                {busy ? t("loading") : "নিশ্চিত করুন"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <div className="font-extrabold text-base mb-1">
              {lang === "en" ? "Reset Password" : "পাসওয়ার্ড রিসেট"}
            </div>
            <div className="text-xs text-mute mb-4">
              {customer.name} — {customer.mobile}
            </div>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={lang === "en" ? "New password (min 6 chars)" : "নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"}
              className="input mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="press flex-1 bg-gray-100 text-ink text-sm font-bold py-2.5 rounded-xl"
              >
                {lang === "en" ? "Cancel" : "বাতিল"}
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="press flex-1 bg-teal text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
              >
                {resetting ? t("loading") : lang === "en" ? "Save" : "সেভ করুন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
