import React from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { EmptyState } from "../../components/EmptyState";
import { money } from "../../utils/format";

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title={t("cartEmpty")}
        subtitle={t("cartEmptySub")}
        action={
          <button onClick={() => navigate("/")} className="press bg-teal text-white text-sm font-bold px-5 py-2.5 rounded-full">
            {t("home")}
          </button>
        }
      />
    );
  }

  return (
    <div className="pb-40">
      <h1 className="px-4 pt-4 pb-2 font-extrabold text-lg">
        {t("yourCart")} <span className="text-sm font-semibold text-mute">({items.length})</span>
      </h1>

      <div className="px-4 space-y-3">
        {items.map((item) => (
          <div key={`${item.productId}-${item.variantId}`} className="flex gap-3 bg-white border border-border rounded-2xl p-3 shadow-sm">
            <div className="w-24 h-24 rounded-xl bg-teal-tint overflow-hidden shrink-0 flex items-center justify-center">
              {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <ShoppingBag className="text-teal/40" size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-bold text-ink line-clamp-2">{lang === "bn" ? item.name_bn : item.name_en}</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {item.size && <span className="text-[11px] bg-teal-tint text-teal-dark font-semibold px-2 py-0.5 rounded-full">{lang === "bn" ? "সাইজ" : "Size"}: {item.size}</span>}
                {item.color && <span className="text-[11px] bg-orange-tint text-orange font-semibold px-2 py-0.5 rounded-full">{lang === "bn" ? "কালার" : "Color"}: {item.color}</span>}
              </div>
              <button onClick={() => removeItem(item.productId, item.variantId)} className="press flex items-center gap-1 text-[12px] font-semibold text-red-500 mt-1.5">
                <Trash2 size={13} /> {lang === "bn" ? "সরান" : "Remove"}
              </button>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                    className="press w-9 h-8 flex items-center justify-center text-mute"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-extrabold w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                    className="press w-9 h-8 flex items-center justify-center text-mute"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-mute">
                    {item.quantity} × {money(item.price)}
                  </div>
                  <div className="font-extrabold text-orange text-[15px]">{money(item.price * item.quantity)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-4 bg-white border border-border rounded-2xl p-4 shadow-sm">
        <div className="font-extrabold text-[15px] mb-3">{lang === "bn" ? "অর্ডার সারাংশ" : "Order Summary"}</div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-mute">{t("subtotal")}</span>
          <span className="font-bold">{money(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm pb-3 border-b border-border">
          <span className="text-mute">{t("delivery")}</span>
          <span className="text-[12px] text-mute">{lang === "bn" ? "চেকআউটে হিসাব হবে" : "Calculated at checkout"}</span>
        </div>
        <div className="flex items-center justify-between pt-3">
          <span className="font-extrabold">{t("total")}</span>
          <span className="font-extrabold text-orange text-lg">{money(subtotal)}</span>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-border px-4 py-3 z-30 safe-bottom">
        <button
          onClick={() => navigate("/checkout")}
          className="press w-full bg-orange text-white font-extrabold text-[15px] py-3.5 rounded-xl shadow-md"
        >
          {t("proceedToCheckout")} · {money(subtotal)}
        </button>
      </div>
    </div>
  );
}
