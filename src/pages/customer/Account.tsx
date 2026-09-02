import React from "react";
import { useNavigate } from "react-router-dom";
import { User, MessageCircle, Phone, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER;
const PHONE = import.meta.env.VITE_PHONE_NUMBER;

export default function Account() {
  const { customer, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="bg-teal rounded-2xl p-5 text-white flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
          <User size={22} />
        </div>
        <div className="min-w-0">
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
      </div>

      <div className="space-y-2">
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
