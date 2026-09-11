import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Phone, Calendar, KeyRound, Package } from "lucide-react";
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

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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
      }

      setLoading(false);
    }
    load();
  }, [id]);

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
