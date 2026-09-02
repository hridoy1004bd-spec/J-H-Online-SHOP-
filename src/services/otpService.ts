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

/**
 * Thin client for the OTP Edge Functions. All real OTP logic (generation,
 * hashing, expiry, rate limiting, SMS sending) lives server-side in
 * supabase/functions/send-otp and verify-otp — this file never has access
 * to the raw code except in explicit local development mode, where the
 * function itself echoes it back for convenience.
 */
export const otpService = {
  async sendOtp(mobile: string, purpose: "login" | "order" = "login"): Promise<SendOtpResult> {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, purpose })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Failed to send OTP" };
      return data;
    } catch {
      return { success: false, error: "Network error while sending OTP" };
    }
  },

  async verifyOtp(mobile: string, code: string, name?: string): Promise<VerifyOtpResult> {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, code, name })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Verification failed" };

      // Exchange the token hash for a real client-side Supabase session.
      if (data.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: "magiclink"
        });
        if (error) return { success: false, error: "Could not establish session" };
      }

      return { success: true, customer: data.customer };
    } catch {
      return { success: false, error: "Network error while verifying OTP" };
    }
  }
};
