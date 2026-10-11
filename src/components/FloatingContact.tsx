import React, { useEffect, useState } from "react";
import { MessageCircle, Phone, Send, X, Headphones } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../i18n/LanguageContext";

interface Info {
  phone: string | null;
  whatsapp: string | null;
  messenger_url: string | null;
  telegram_url: string | null;
  float_buttons_enabled: boolean | null;
}

export default function FloatingContact() {
  const { lang } = useLanguage();
  const [info, setInfo] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("store_settings")
      .select("phone, whatsapp, messenger_url, telegram_url, float_buttons_enabled")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setInfo(data as Info);
      });
  }, []);

  if (!info || info.float_buttons_enabled === false) return null;

  const wa = (info.whatsapp ?? "").replace(/\D/g, "");
  const tel = (info.phone ?? "").trim();
  const options = [
    { url: wa ? `https://wa.me/${wa}` : null, icon: MessageCircle, bg: "bg-[#25D366]", label: "WhatsApp" },
    { url: info.messenger_url?.trim() || null, icon: MessageCircle, bg: "bg-[#0084FF]", label: "Messenger" },
    { url: info.telegram_url?.trim() || null, icon: Send, bg: "bg-[#229ED9]", label: "Telegram" },
    { url: tel ? `tel:${tel}` : null, icon: Phone, bg: "bg-orange", label: lang === "bn" ? "কল করুন" : "Call" }
  ].filter((o) => o.url);

  if (options.length === 0) return null;

  return (
    <div className="fixed right-3 z-40 flex flex-col items-end gap-2" style={{ bottom: "88px" }}>
      {open &&
        options.map(({ url, icon: Icon, bg, label }) => (
          <a
            key={label}
            href={url as string}
            target={(url as string).startsWith("tel:") ? undefined : "_blank"}
            rel="noreferrer"
            className="press flex items-center gap-2"
          >
            <span className="bg-white text-ink text-[11.5px] font-bold px-2.5 py-1 rounded-full shadow border border-border">{label}</span>
            <span className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center shadow-lg`}>
              <Icon size={20} className="text-white" />
            </span>
          </a>
        ))}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Contact"
        className="press w-12 h-12 rounded-full bg-teal text-white flex items-center justify-center shadow-lg"
      >
        {open ? <X size={22} /> : <Headphones size={22} />}
      </button>
    </div>
  );
}
