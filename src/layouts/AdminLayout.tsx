import React, { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Plus,
  Package,
  ClipboardList,
  Users2,
  TrendingUp,
  Wallet,
  CreditCard,
  Settings as SettingsIcon,
  MessageCircle,
  Image,
  Megaphone,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

export default function AdminLayout() {
  const { isAdmin, loading, signOut } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) return <div className="p-8 text-center text-mute text-sm">{t("loading")}</div>;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  const links = [
    { to: "/admin", icon: LayoutDashboard, label: t("dashboard"), end: true },
    { to: "/admin/products/new", icon: Plus, label: t("newProduct") },
    { to: "/admin/products", icon: Package, label: t("allProductsAdmin") },
    { to: "/admin/orders", icon: ClipboardList, label: t("orderMgmt") },
    { to: "/admin/customers", icon: Users2, label: t("customers") },
    { to: "/admin/sales", icon: TrendingUp, label: t("salesProfit") },
    { to: "/admin/balance", icon: Wallet, label: t("balance") },
    { to: "/admin/payments", icon: CreditCard, label: t("paymentSettings") },
    { to: "/admin/settings", icon: SettingsIcon, label: t("storeSettings") },
    { to: "/admin/support", icon: MessageCircle, label: t("support") },
    { to: "/admin/banners", icon: Image, label: lang === "en" ? "Banners" : "ব্যানার" },
    { to: "/admin/notices", icon: Megaphone, label: lang === "en" ? "Notices" : "নোটিশ" }
  ];

  return (
    <div className="min-h-screen bg-[#FBFCFC] flex">
      {/* Mobile overlay */}
      {menuOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMenuOpen(false)} />}

      <aside
        className={`fixed md:static z-50 top-0 left-0 h-full w-64 bg-white border-r border-border flex flex-col transition-transform duration-200 ${
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <span className="font-extrabold text-teal-dark text-sm">{t("admin")}</span>
          <button className="md:hidden" onClick={() => setMenuOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-semibold ${
                  isActive ? "bg-teal-tint text-teal-dark border-r-2 border-teal" : "text-ink"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <button
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="w-full text-xs font-bold bg-teal-tint text-teal-dark rounded-full py-2"
          >
            {lang === "bn" ? "EN" : "বাংলা"}
          </button>
          <button
            onClick={async () => {
              await signOut();
              navigate("/admin/login");
            }}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-600 py-2"
          >
            <LogOut size={14} /> {t("exitAdmin")}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border sticky top-0 z-30">
          <button onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm">{t("admin")}</span>
        </div>
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
