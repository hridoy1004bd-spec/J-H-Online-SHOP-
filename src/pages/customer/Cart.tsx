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
      <h1 className="px-4 pt-4 pb-2 font-extrabold text-lg">{t("yourCart")}</h1>

      <div className="px-4 space-y-3">
        {items.map((item) => (
          <div key={`${item.productId}-${item.variantId}`} className="flex gap-3 bg-white border border-border rounded-2xl p-3">
            <div className="w-20 h-20 rounded-xl bg-teal-tint overflow-hidden shrink-0 flex items-center justify-center">
              {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <ShoppingBag className="text-teal/40" size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-ink line-clamp-2">{lang === "bn" ? item.name_bn : item.name_en}</div>
              <div className="text-[11px] text-mute mt-0.5">
                {[item.size, item.color].filter(Boolean).join(" · ")}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-extrabold text-teal-dark text-sm">{money(item.price)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                    className="press w-7 h-7 rounded-full border border-border flex items-center justify-center"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                    className="press w-7 h-7 rounded-full border border-border flex items-center justify-center"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => removeItem(item.productId, item.variantId)} className="press self-start text-mute">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-border px-4 py-3 z-30 safe-bottom">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-mute">{t("subtotal")}</span>
          <span className="font-extrabold text-lg">{money(subtotal)}</span>
        </div>
        <button
          onClick={() => navigate("/checkout")}
          className="press w-full bg-orange text-white font-bold text-sm py-3.5 rounded-xl"
        >
          {t("proceedToCheckout")}
        </button>
      </div>
    </div>
  );
}
