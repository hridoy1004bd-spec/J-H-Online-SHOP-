import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { otpService } from "../../services/otpService";
import { orderService } from "../../services/orderService";
import { isNonEmpty, isValidBangladeshiMobile } from "../../utils/validation";
import { money, formatDate } from "../../utils/format";
import type { Order } from "../../types";

type Step = "identify" | "otp" | "address" | "placing" | "success";

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { customer, refreshCustomer } = useAuth();
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(customer ? "address" : "identify");
  const [name, setName] = useState(customer?.name ?? "");
  const [mobile, setMobile] = useState(customer?.mobile ?? "");
  const [otp, setOtp] = useState("");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [fullAddress, setFullAddress] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [landmark, setLandmark] = useState("");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const deliveryCharge = /dhaka/i.test(city) ? 60 : 120;
  const total = subtotal + deliveryCharge;

  async function handleSendOtp() {
    if (!isNonEmpty(name)) return showToast(t("yourName"), "error");
    if (!isValidBangladeshiMobile(mobile)) return showToast(t("mobileNumber"), "error");
    setSending(true);
    const res = await otpService.sendOtp(mobile, "order");
    setSending(false);
    if (!res.success) return showToast(res.error || t("error"), "error");
    setDevOtpHint(res.devMode ? res.devOtp ?? null : null);
    setStep("otp");
  }

  async function handleVerifyOtp() {
    if (otp.length < 4) return;
    setSending(true);
    const res = await otpService.verifyOtp(mobile, otp, name);
    setSending(false);
    if (!res.success) return showToast(res.error || t("error"), "error");
    await refreshCustomer();
    setStep("address");
  }

  async function handleConfirmOrder() {
    if (!isNonEmpty(fullAddress) || !isNonEmpty(city)) return showToast(t("deliveryAddress"), "error");
    setStep("placing");
    setPlaceError(null);
    const res = await orderService.createOrder({
      items,
      fullAddress,
      area,
      city,
      landmark,
      paymentMethod: "cod"
    });
    if (!res.success || !res.order) {
      setPlaceError(res.error || t("error"));
      setStep("address");
      return;
    }
    setPlacedOrder(res.order);
    clear();
    setStep("success");
  }

  if (step === "success" && placedOrder) {
    return (
      <div className="flex flex-col items-center text-center px-8 pt-16">
        <div className="w-16 h-16 rounded-full bg-teal-tint flex items-center justify-center mb-4">
          <CheckCircle2 className="text-teal" size={32} />
        </div>
        <div className="font-extrabold text-lg mb-1">{t("orderPlaced")}</div>
        <div className="text-mute text-sm mb-6">{t("orderPlacedSub")}</div>
        <div className="w-full bg-white border border-border rounded-2xl p-4 text-left space-y-2">
          <Row label={t("orderId")} value={placedOrder.order_number} />
          <Row label={t("orderDate")} value={formatDate(placedOrder.created_at, lang)} />
          <Row label={t("orderTotal")} value={money(placedOrder.total)} bold />
        </div>
        <div className="flex gap-3 w-full mt-6">
          <button onClick={() => navigate("/orders")} className="press flex-1 bg-teal text-white text-sm font-bold py-3 rounded-xl">
            {t("trackOrder")}
          </button>
          <button onClick={() => navigate("/")} className="press flex-1 bg-teal-tint text-teal-dark text-sm font-bold py-3 rounded-xl">
            {t("backHome")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-36">
      <h1 className="px-4 pt-4 pb-3 font-extrabold text-lg">{t("checkoutTitle")}</h1>

      {step === "identify" && (
        <div className="px-4 space-y-4">
          <Field label={t("yourName")}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePh")} className="input" />
          </Field>
          <Field label={t("mobileNumber")}>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              placeholder={t("mobilePh")}
              maxLength={11}
              className="input"
            />
          </Field>
          <button onClick={handleSendOtp} disabled={sending} className="press w-full bg-teal text-white font-bold text-sm py-3.5 rounded-xl disabled:opacity-60">
            {sending ? t("loading") : t("sendOtp")}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="px-4 space-y-4">
          <div className="text-sm text-mute">{t("enterOtp")} — {mobile}</div>
          {devOtpHint && (
            <div className="text-xs bg-orange-tint text-orange font-bold rounded-lg px-3 py-2">
              {t("devOtpNote")}: {devOtpHint}
            </div>
          )}
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={4}
            inputMode="numeric"
            className="input text-center text-2xl tracking-[0.5em] font-bold"
            placeholder="••••"
          />
          <button onClick={handleVerifyOtp} disabled={sending || otp.length < 4} className="press w-full bg-teal text-white font-bold text-sm py-3.5 rounded-xl disabled:opacity-60">
            {sending ? t("loading") : t("verify")}
          </button>
          <div className="flex justify-between text-xs">
            <button onClick={() => setStep("identify")} className="text-mute font-semibold">{t("changeNumber")}</button>
            <button onClick={handleSendOtp} className="text-teal font-semibold">{t("resend")}</button>
          </div>
        </div>
      )}

      {(step === "address" || step === "placing") && (
        <div className="px-4 space-y-4">
          {placeError && <div className="text-xs bg-red-50 text-red-600 font-semibold rounded-lg px-3 py-2">{placeError}</div>}

          <div className="text-xs font-bold text-mute uppercase">{t("deliveryAddress")}</div>
          <Field label={t("fullAddress")}>
            <input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} className="input" />
          </Field>
          <div className="flex gap-3">
            <Field label={t("area")} className="flex-1">
              <input value={area} onChange={(e) => setArea(e.target.value)} className="input" />
            </Field>
            <Field label={t("city")} className="flex-1">
              <input value={city} onChange={(e) => setCity(e.target.value)} className="input" />
            </Field>
          </div>
          <Field label={t("landmark")}>
            <input value={landmark} onChange={(e) => setLandmark(e.target.value)} className="input" />
          </Field>

          <div className="text-xs font-bold text-mute uppercase pt-2">{t("paymentMethod")}</div>
          <div className="bg-teal-tint rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm font-bold text-teal-dark">{t("cod")}</span>
            <CheckCircle2 className="text-teal" size={18} />
          </div>
          <div className="text-[11px] text-mute">{t("codNote")}</div>

          <div className="bg-white border border-border rounded-2xl p-4 space-y-2 mt-2">
            <div className="text-xs font-bold text-mute uppercase mb-1">{t("orderSummary")}</div>
            <Row label={t("subtotal")} value={money(subtotal)} />
            <Row label={t("delivery")} value={money(deliveryCharge)} />
            <Row label={t("total")} value={money(total)} bold />
          </div>

          <button
            onClick={handleConfirmOrder}
            disabled={step === "placing"}
            className="press w-full bg-orange text-white font-bold text-sm py-3.5 rounded-xl disabled:opacity-60"
          >
            {step === "placing" ? t("placingOrder") : t("confirmOrder")}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-bold text-mute mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={`text-sm ${bold ? "font-extrabold text-ink" : "text-mute"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-extrabold text-teal-dark" : "text-ink"}`}>{value}</span>
    </div>
  );
}
