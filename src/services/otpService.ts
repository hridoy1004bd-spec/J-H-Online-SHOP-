import { supabase, FUNCTIONS_URL } from "../lib/supabase";
import type { Customer } from "../types";

interface SendOtpResult {
  success: boolean;
  devMode?: boolean;
  devOtp?: string;
  expiresInSeconds?: number;
  error?: string;
}

interface VerifyOtpResult {
  success: boolean;
  customer?: Customer;
  error?: string;
}

interface SignupResult {
  success: boolean;
  code?: string;
}

function mobileToInternalEmail(mobile: string): string {
  return `${mobile}@customers.jhonlineshop.internal`;
}

/** ওটিপি ছাড়া সাইনআপের এরর কোড থেকে ব্যবহারকারীর জন্য লেখা */
export function signupErrorMessage(code: string | undefined, lang: string): string {
  const en = lang === "en";
  switch (code) {
    case "ACCOUNT_EXISTS":
      return en
        ? "An account already exists for this number. Please login. (Forgot password? Contact us on WhatsApp.)"
        : "এই নম্বরে আগেই অ্যাকাউন্ট আছে। লগইন করুন। (পাসওয়ার্ড ভুলে গেলে WhatsApp-এ জানান।)";
    case "OTP_REQUIRED":
      return en ? "Please verify with OTP to create an account." : "অ্যাকাউন্ট খুলতে ওটিপি দিয়ে যাচাই করতে হবে।";
    case "WEAK_PASSWORD":
      return en ? "Password must be at least 6 characters" : "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন";
    case "INVALID_MOBILE":
      return en ? "Enter a valid mobile number" : "সঠিক মোবাইল নম্বর দিন";
    case "NAME_REQUIRED":
      return en ? "Enter your name" : "আপনার নাম লিখুন";
    case "RATE_LIMITED":
      return en ? "Too many attempts. Please try again later." : "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।";
    case "NETWORK":
      return en ? "Network problem. Please try again." : "নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।";
    default:
      return en ? "Could not create the account. Please try again." : "অ্যাকাউন্ট খোলা যায়নি। আবার চেষ্টা করুন।";
  }
}

/**
 * Thin client for the OTP Edge Functions. All real OTP logic (generation,
 * hashing, expiry, rate limiting, SMS sending) lives server-side in
 * supabase/functions/send-otp and verify-otp.
 *
 * অ্যাডমিন স্টোর সেটিংসের "ওটিপি আবশ্যক" সুইচ (store_settings.otp_required) বন্ধ থাকলে
 * সাইনআপ হয় মোবাইল + পাসওয়ার্ড দিয়ে (customer-signup ফাংশন), ওটিপি ছাড়া।
 */
export const otpService = {
  /** ওটিপি আবশ্যক কি না। পড়তে না পারলে নিরাপদ দিকে (আবশ্যক) ধরা হয়। */
  async getOtpRequired(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from("store_settings").select("otp_required").eq("id", 1).maybeSingle();
      if (error || !data) return true;
      return (data as { otp_required?: boolean | null }).otp_required !== false;
    } catch {
      return true;
    }
  },

  /** ওটিপি ছাড়া নতুন অ্যাকাউন্ট (মোবাইল + পাসওয়ার্ড) খুলে সাথে সাথে লগইন করায় */
  async signupWithPassword(mobile: string, name: string, password: string): Promise<SignupResult> {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/customer-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, name, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) return { success: false, code: data.error || "SIGNUP_FAILED" };

      const { error } = await supabase.auth.signInWithPassword({
        email: mobileToInternalEmail(mobile),
        password
      });
      if (error) return { success: false, code: "LOGIN_FAILED" };
      return { success: true };
    } catch {
      return { success: false, code: "NETWORK" };
    }
  },

  async sendOtp(mobile: string, purpose: "login" | "order" = "login"): Promise<SendOtpResult> {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, purpose })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "SMS_NOT_CONFIGURED") {
          return {
            success: false,
            error: "SMS সার্ভিস এখনো চালু হয়নি। / SMS service is not active yet."
          };
        }
        return { success: false, error: data.error || "Failed to send OTP" };
      }
      return data;
    } catch {
      return { success: false, error: "Network error while sending OTP" };
    }
  },

  async verifyOtp(mobile: string, code: string, name?: string, password?: string): Promise<VerifyOtpResult> {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, code, name, password })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Verification failed" };

      // Exchange the token hash for a real client-side Supabase session.
      if (data.tokenHash) {
        let { error } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: "email"
        });
        if (error) {
          // পুরনো টোকেন টাইপের জন্য আরেকবার চেষ্টা
          const retry = await supabase.auth.verifyOtp({ token_hash: data.tokenHash, type: "magiclink" });
          error = retry.error;
        }
        if (error) return { success: false, error: "Could not establish session: " + error.message };
      }

      return { success: true, customer: data.customer };
    } catch {
      return { success: false, error: "Network error while verifying OTP" };
    }
  }
};
