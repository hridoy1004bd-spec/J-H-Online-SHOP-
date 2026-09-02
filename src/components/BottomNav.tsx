import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Grid3x3, Package, ShoppingCart, User } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { useCart } from "../contexts/CartContext";

export default function BottomNav() {
  const { t } = useLanguage();
  const { itemCount } = useCart();

  const items = [
    { to: "/", icon: Home, label: t("home") },
    { to: "/categories", icon: Grid3x3, label: t("categories") },
    { to: "/orders", icon: Package, label: t("orders") },
    { to: "/cart", icon: ShoppingCart, label: t("cart"), badge: itemCount },
    { to: "/account", icon: User, label: t("account") }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border safe-bottom">
      <div className="grid grid-cols-5">
        {items.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `press flex flex-col items-center gap-0.5 py-2 relative ${isActive ? "text-teal" : "text-mute"}`
            }
          >
            <div className="relative">
              <Icon size={20} />
              {!!badge && (
                <span className="absolute -top-1.5 -right-2 bg-orange text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
