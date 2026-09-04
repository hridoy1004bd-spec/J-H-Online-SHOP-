import { supabase, FUNCTIONS_URL } from "../lib/supabase";
import type { CartLine, Order, PaymentMethod } from "../types";

export const orderService = {
  async createOrder(params: {
    items: CartLine[];
    fullAddress: string;
    area: string;
    city: string;
    landmark?: string;
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    couponCode?: string;
    clientToken?: string;
  }) {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) return { success: false, error: "Please verify your mobile number first" };

    const res = await fetch(`${FUNCTIONS_URL}/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        items: params.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity
        })),
        fullAddress: params.fullAddress,
        area: params.area,
        city: params.city,
        landmark: params.landmark,
        paymentMethod: params.paymentMethod,
        paymentReference: params.paymentReference,
        couponCode: params.couponCode,
        clientToken: params.clientToken
      })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || "Failed to place order" };
    return { success: true, order: data.order as Order };
  },

  async myOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Order[];
  },

  async cancel(orderId: string, reason: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled", cancel_reason: reason })
      .eq("id", orderId)
      .eq("status", "pending");
    if (error) throw error;
  }
};
