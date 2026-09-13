import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, MessageCircle, Phone, LogOut, ChevronRight, Wallet, Gift, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { supabase } from "../../lib/supabase";
import { otpService } from "../../services/otpService";
import { isNonEmpty, isValidBangladeshiMobile } from "../../utils/validation";
import { money } from "../../utils/format";

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER;
const PHONE = import.meta.env.VITE_PHONE_NUMBER;

type LoginStep = "identify" | "otp";
type LoginMode = "otp" | "password";

function mobileToInternalEmail(mobile: string): string {
  return `${mobile}@customers.jhonlineshop.internal`;
}

export default function Account() {
  const { customer, signOut, refreshCustomer } = useAuth();
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("otp");
  const [loginStep, setLoginStep] = useState<LoginStep>("identify");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [giftCode, setGiftCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  React.useEffect(() => {
    async function loadWallet() {
      if (!customer?.auth_user_id) {
        setWalletBalance(0);
        return;
      }
      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", customer.auth_user_id)
        .maybeSingle();
      setWalletBalance(Number(data?.balance ?? 0));
    }
    loadWallet();
  }, [customer?.auth_user_id]);

  function resetLoginForm() {
    setLoginStep("identify");
    setLoginMode("otp");
    setName("");
    setMobile("");
    setPassword("");
    setOtp("");
    setDevOtpHint(null);
  }

  async function handleSendOtp() {
    if (!isNonEmpty(name)) return showToast(t("yourName"), "error");
    if (!isValidBangladeshiMobile(mobile)) return showToast(t("mobileNumber"), "error");
    setSending(true);
    const res = await otpService.sendOtp(mobile, "login");
    setSending(false);
    if (!res.success) return showToast(res.error || t("error"), "error");
    setDevOtpHint(res.devMode ? res.devOtp ?? null : null);
    setLoginStep("otp");
  }

  async function handleVerifyOtp() {
    if (otp.length < 4) return;
    setSending(true);
    const res = await otpService.verifyOtp(mobile, otp, name);
    setSending(false);
    if (!res.success) return showToast(res.error || t("error"), "error");
    await refreshCustomer();
    setShowLogin(false);
    resetLoginForm();
  }

  async function handlePasswordLogin() {
    if (!isValidBangladeshiMobile(mobile)) return showToast(t("mobileNumber"), "error");
    if (password.length < 4) {
      showToast(lang === "en" ? "Please enter your password" : "পাসওয়ার্ড দিন", "error");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: mobileToInternalEmail(mobile),
      password
    });
    setSending(false);
    if (error) {
      showToast(
        lang === "en" ? "Incorrect mobile number or password" : "মোবাইল নম্বর বা পাসওয়ার্ড ভুল হয়েছে",
        "error"
      );
      return;
    }
    await refreshCustomer();
    setShowLogin(false);
    resetLoginForm();
  }

  async function handleRedeemGiftCard() {
    if (!customer?.auth_user_id) return;
    if (!isNonEmpty(giftCode)) return;
    setRedeeming(true);
    const { data, error } = await supabase.rpc("redeem_gift_card", {
      p_code: giftCode.trim(),
      p_user_id: customer.auth_user_id
    });
    setRedeeming(false);
    if (error || !data?.success) {
      showToast(data?.error || error?.message || (lang === "en" ? "Failed to redeem" : "রিডিম করা যায়নি"), "error");
      return;
    }
    showToast(
      lang === "en" ? `৳${data.amount} added to your wallet!` : `৳${data.amount} আপনার ওয়ালেটে যোগ হয়েছে!`,
      "success"
    );
    setWalletBalance(Number(data.new_balance));
    setGiftCode("");
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="bg-teal rounded-2xl p-5 text-white flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
          <User size={22} />
        </div>
        <div className="min-w-0 flex-1">
          {customer ? (
            <>
              <div className="font-bold text-sm">{t("welcomeBack")}, {customer.name}</div>
              <div className="text-white/80 text-xs">{customer.mobile}</div>
            </>
          ) : (
            <>
              <div className="font-bold text-sm">{t("notLoggedIn")}</div>
              <div className="text-white/80 text-xs">{t("notLoggedInSub")}</div>
            </>
          )}
        </div>
        {!customer && (
          <button
            onClick={() => setShowLogin(true)}
            className="press bg-white text-teal-dark text-xs font-bold px-4 py-2 rounded-full shrink-0"
          >
            {lang === "en" ? "Login" : "লগইন"}
          </button>
        )}
      </div>

      {customer && (
        <div className="bg-white border border-border rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-mute font-bold mb-1">
            <Wallet size={14} className="text-teal" /> {lang === "en" ? "Wallet Balance" : "ওয়ালেট ব্যালেন্স"}
          </div>
          <div className="text-2xl font-extrabold text-teal-dark mb-3">{money(walletBalance)}</div>

          <div className="flex items-center gap-1.5 text-xs text-mute font-bold mb-2">
            <Gift size={14} className="text-orange" /> {lang === "en" ? "Redeem Gift Card" : "গিফট কার্ড রিডিম করুন"}
          </div>
          <div className="flex gap-2">
            <input
              value={giftCode}
              onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
              placeholder={lang === "en" ? "Enter gift card code" : "গিফট কার্ড কোড লিখুন"}
              className="input flex-1"
            />
            <button
              onClick={handleRedeemGiftCard}
              disabled={redeeming || !giftCode.trim()}
              className="press bg-orange text-white text-xs font-bold px-4 rounded-xl disabled:opacity-60"
            >
              {redeeming ? t("loading") : lang === "en" ? "Redeem" : "রিডিম"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 mt-2">
        <MenuRow icon={<User size={17} className="text-teal" />} label={t("myOrders")} onClick={() => navigate("/orders")} />
        <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">
          <MenuRow icon={<MessageCircle size={17} className="text-orange" />} label={t("whatsapp")} onClick={() => {}} />
        </a>
        <a href={`tel:${PHONE}`}>
          <MenuRow icon={<Phone size={17} className="text-orange" />} label={t("callUs")} onClick={() => {}} />
        </a>
        {customer && (
          <MenuRow icon={<LogOut size={17} className="text-red-500" />} label={t("logout")} onClick={signOut} danger />
        )}
      </div>

      <button onClick={() => navigate("/admin/login")} className="text-[11px] text-mute mt-8 block mx-auto">
        {t("admin")}
      </button>

      {showLogin && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 relative">
            <button
              onClick={() => {
                setShowLogin(false);
                resetLoginForm();
              }}
              className="absolute right-4 top-4 text-mute"
            >
              <X size={18} />
            </button>

            <div className="font-extrabold text-base mb-4">{lang === "en" ? "Login" : "লগইন করুন"}</div>

            {loginStep === "identify" && (
              <>
                <div className="grid grid-cols-2 gap-2 bg-teal-tint p-1 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setLoginMode("otp")}
                    className={`press text-xs font-bold py-2 rounded-lg ${
                      loginMode === "otp" ? "bg-white text-teal-dark shadow" : "text-teal-dark/60"
                    }`}
                  >
                    {lang === "en" ? "OTP" : "OTP দিয়ে"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode("password")}
                    className={`press text-xs font-bold py-2 rounded-lg ${
                      loginMode === "password" ? "bg-white text-teal-dark shadow" : "text-teal-dark/60"
                    }`}
                  >
                    {lang === "en" ? "Password" : "পাসওয়ার্ড দিয়ে"}
                  </button>
                </div>

                {loginMode === "otp" ? (
                  <div className="space-y-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("namePh")}
                      className="input"
                    />
                    <input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                      placeholder={t("mobilePh")}
                      maxLength={11}
                      className="input"
                    />
                    <button
                      onClick={handleSendOtp}
                      disabled={sending}
                      className="press w-full bg-teal text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60"
                    >
                      {sending ? t("loading") : t("sendOtp")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                      placeholder={t("mobilePh")}
                      maxLength={11}
                      className="input"
                    />
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      placeholder={lang === "en" ? "Password" : "পাসওয়ার্ড"}
                      className="input"
                    />
                    <button
                      onClick={handlePasswordLogin}
                      disabled={sending}
                      className="press w-full bg-teal text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60"
                    >
                      {sending ? t("loading") : lang === "en" ? "Login" : "লগইন করুন"}
                    </button>
                  </div>
                )}
              </>
            )}

            {loginStep === "otp" && (
              <div className="space-y-3">
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
                  placeholder="****"
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={sending || otp.length < 4}
                  className="press w-full bg-teal text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60"
                >
                  {sending ? t("loading") : t("verify")}
                </button>
                <div className="flex justify-between text-xs">
                  <button onClick={() => setLoginStep("identify")} className="text-mute font-semibold">
                    {t("changeNumber")}
                  </button>
                  <button onClick={handleSendOtp} className="text-teal font-semibold">
                    {t("resend")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  danger
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`press w-full flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3.5 ${
        danger ? "text-red-500" : "text-ink"
      }`}
    >
      {icon}
      <span className="text-sm font-semibold flex-1 text-left">{label}</span>
      <ChevronRight size={16} className="text-mute" />
    </button>
  );
}
