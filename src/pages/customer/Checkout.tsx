import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, MessageCircle, Copy } from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { otpService } from "../../services/otpService";
import { orderService } from "../../services/orderService";
import { isNonEmpty, isValidBangladeshiMobile } from "../../utils/validation";
import { money, formatDate } from "../../utils/format";
import type { Order, PaymentMethod } from "../../types";

type Step = "identify" | "otp" | "address" | "placing" | "success";

const ADMIN_WHATSAPP_NUMBER = "8801856191004";
const BKASH_NUMBER = "01880176772";
const NAGAD_NUMBER = "01856191004";

function buildOrderWhatsappMessage(order: Order): string {
  const lines: string[] = [];
  lines.push("J H Online SHOP - New Order");
  lines.push("-----------------------------");
  lines.push(`Order ID: ${order.order_number}`);
  lines.push(`Name: ${order.customer_name ?? ""}`);
  lines.push(`Phone: ${order.customer_mobile ?? ""}`);
  lines.push(`Address: ${order.full_address ?? ""}`);
  if (order.area) lines.push(`Area: ${order.area}`);
  if (order.city) lines.push(`City: ${order.city}`);
  if (order.landmark) lines.push(`Landmark: ${order.landmark}`);
  lines.push("");
  lines.push("Products:");
  (order.order_items ?? []).forEach((it: any) => {
    const parts = [it.product_name ?? it.product_name_snapshot ?? "Product"];
    if (it.size) parts.push(`Size: ${it.size}`);
    if (it.color) parts.push(`Color: ${it.color}`);
    parts.push(`Qty: ${it.quantity}`);
    parts.push(`Price: ৳${it.unit_price ?? it.price_snapshot ?? ""}`);
    lines.push(`- ${parts.join(" | ")}`);
  });
  lines.push("");
  lines.push(`Subtotal: ৳${order.subtotal}`);
  lines.push(`Delivery Charge: ৳${order.delivery_charge}`);
  lines.push(`Total: ৳${order.total}`);
  lines.push(`Payment Method: ${order.payment_method ?? "cod"}`);
  lines.push(`Order Date: ${order.created_at ?? ""}`);
  return lines.join("\n");
}

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bkash");
  const [paymentReference, setPaymentReference] = useState("");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [clientToken] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const deliveryCharge = /dhaka/i.test(city) ? 60 : 120;
  const total = subtotal + deliveryCharge;
  const payNumber = paymentMethod === "nagad" ? NAGAD_NUMBER : BKASH_NUMBER;
  const referenceReady = paymentReference.trim().length >= 4;

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

  function copyNumber() {
    navigator.clipboard?.writeText(payNumber);
    showToast(lang === "en" ? "Number copied" : "নম্বর কপি হয়েছে", "success");
  }

  async function handleConfirmOrder() {
    if (!isNonEmpty(fullAddress) || !isNonEmpty(city)) return showToast(t("deliveryAddress"), "error");
    if (!referenceReady) {
      return showToast(
        lang === "en"
          ? "Please pay the delivery charge and enter the Transaction ID"
          : "দয়া করে ডেলিভারি চার্জ পাঠিয়ে ট্রানজেকশন আইডি দিন",
        "error"
      );
    }
    setStep("placing");
    setPlaceError(null);
    const res = await orderService.createOrder({
      items,
      fullAddress,
      area,
      city,
      landmark,
      paymentMethod,
      paymentReference: paymentReference.trim(),
      clientToken
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
    const whatsappHref = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(
      buildOrderWhatsappMessage(placedOrder)
    )}`;

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

        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="press w-full mt-4 bg-[#25D366] text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <MessageCircle size={18} />
          {lang === "en" ? "Share order on WhatsApp" : "WhatsApp-এ অর্ডারটি শেয়ার করুন"}
        </a>

        <div className="flex gap-3 w-full mt-3">
          <button onClick={() => navigate("/orders")} className="press flex-1 bg-teal text-white text-sm font-bold py-3 rounded-xl">
            {t("trackOrder")}
          </button>
          <button onClick={() => navigate("/")} className="press flex-1 bg-teal-tint text-teal-dark text-sm font
