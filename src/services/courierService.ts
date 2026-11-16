import { supabase } from "../lib/supabase";

export interface CourierSettings {
  mode: "manual" | "auto";
  provider: "steadfast" | "pathao" | "redx";
  steadfast_configured: boolean;
}
export interface CourierBooking {
  id: number;
  order_id: string;
  provider: string;
  status: "booking" | "booked" | "failed";
  consignment_id: string | null;
  tracking_code: string | null;
  delivery_status: string | null;
  cod_amount: number;
  last_error: string | null;
  attempts: number;
  updated_at: string;
}

const ERR: Record<string, string> = {
  FORBIDDEN: "শুধু অ্যাডমিন এটা করতে পারবে",
  NOT_CONFIGURED: "Steadfast API Key সেট করা নেই (Supabase → Edge Functions → Secrets)",
  NOT_CONFIRMED: "শুধু কনফার্ম করা অর্ডার কুরিয়ারে যাবে",
  ALREADY_BOOKED: "এই অর্ডার আগেই কুরিয়ারে বুক করা হয়েছে",
  BOOKING_FAILED: "কুরিয়ার বুকিং ব্যর্থ হয়েছে",
  ORDER_NOT_FOUND: "অর্ডার পাওয়া যায়নি"
};

export async function courierCall<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("courier-book", { body });
  if (error) {
    let code = "";
    let msg = "";
    try {
      const j = await (error as unknown as { context?: Response }).context?.json();
      code = j?.error ?? "";
      msg = j?.message ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(ERR[code] ? ERR[code] + (code === "BOOKING_FAILED" && msg ? ": " + msg.slice(0, 120) : "") : msg || "কুরিয়ার সার্ভারে সমস্যা হয়েছে");
  }
  return data as T;
}

export const courierSettings = () => courierCall<CourierSettings & { ok: boolean }>({ action: "settings" });
export const courierBook = (orderId: string) => courierCall({ action: "book", order_id: orderId });
export const courierSync = (orderId?: string) => courierCall<{ checked: number; updated: number }>({ action: "sync", order_id: orderId });

/** অর্ডার কনফার্ম হলে, মোড auto হলে স্বয়ংক্রিয় বুকিং। ব্যর্থ হলে বার্তা ফেরত দেয় (অর্ডার স্ট্যাটাস বদলায় না)। */
export async function maybeAutoBook(orderId: string): Promise<string | null> {
  try {
    const { data } = await supabase.from("courier_settings").select("mode").eq("id", 1).maybeSingle();
    if (data?.mode !== "auto") return null;
    await courierBook(orderId);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
