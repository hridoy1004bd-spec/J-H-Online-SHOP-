import React from "react";
import { MessageCircle, Mail } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

export default function Support() {
  const { t } = useLanguage();
  return (
    <div className="max-w-md">
      <h1 className="font-extrabold text-lg mb-4">{t("support")}</h1>
      <div className="space-y-2">
        <a href="https://wa.me/8801XXXXXXXXX" target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white border border-border rounded-xl p-4">
          <MessageCircle className="text-teal" size={18} />
          <span className="text-sm font-semibold">{t("whatsapp")} Support</span>
        </a>
        <a href="mailto:support@jhonlineshop.com" className="flex items-center gap-3 bg-white border border-border rounded-xl p-4">
          <Mail className="text-teal" size={18} />
          <span className="text-sm font-semibold">support@jhonlineshop.com</span>
        </a>
      </div>
    </div>
  );
}
