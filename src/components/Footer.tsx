import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, MessageCircle, Facebook, Youtube, Instagram, ShoppingBag } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../i18n/LanguageContext";

interface FooterInfo {
  store_name: string | null;
  logo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  footer_about_bn: string | null;
  footer_about_en: string | null;
  footer_links: { label: string; url: string }[] | null;
}

interface PayChip {
  key: string;
  label_en: string;
  label_bn: string;
  color: string | null;
}

export default function Footer() {
  const { lang, t } = useLanguage();
  const [info, setInfo] = useState<FooterInfo | null>(null);
  const [chips, setChips] = useState<PayChip[]>([]);

  useEffect(() => {
    supabase
      .from("store_settings")
      .select("store_name, logo_url, phone, whatsapp, email, address, facebook_url, youtube_url, instagram_url, footer_about_bn, footer_about_en, footer_links")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setInfo(data as FooterInfo);
      });
    supabase
      .from("payment_methods")
      .select("key, label_en, label_bn, color")
      .eq("is_enabled", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setChips(data as PayChip[]);
      });
  }, []);

  const name = info?.store_name || "J H Online SHOP";
  const about = lang === "bn" ? info?.footer_about_bn : info?.footer_about_en;
  const waNumber = (info?.whatsapp ?? "").replace(/\D/g, "");

  const socials = [
    { url: info?.facebook_url, icon: Facebook, bg: "bg-[#1877F2]", label: "Facebook" },
    { url: info?.youtube_url, icon: Youtube, bg: "bg-[#E02B20]", label: "YouTube" },
    { url: info?.instagram_url, icon: Instagram, bg: "bg-[#D6249F]", label: "Instagram" },
    { url: waNumber ? `https://wa.me/${waNumber}` : null, icon: MessageCircle, bg: "bg-[#25D366]", label: "WhatsApp" }
  ].filter((s) => s.url);

  const defaultLinks = [
    { url: "/", label: lang === "bn" ? "হোম" : "Home" },
    { url: "/categories", label: t("categories") },
    { url: "/orders", label: lang === "bn" ? "অর্ডার ট্র্যাক করুন" : "Track Order" },
    { url: "/cart", label: t("cart") },
    { url: "/account", label: t("account") }
  ];
  const links = info?.footer_links && info.footer_links.length > 0 ? info.footer_links : defaultLinks;

  return (
    <footer className="mt-8 bg-[#0F2F2C] text-white/90 px-5 pt-7 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white overflow-hidden flex items-center justify-center shrink-0">
          {info?.logo_url ? (
            <img src={info.logo_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <ShoppingBag size={22} className="text-teal" />
          )}
        </div>
        <div className="font-extrabold text-[17px] text-white leading-tight">{name}</div>
      </div>
      {about && <p className="text-[13px] text-white/70 leading-relaxed mt-3">{about}</p>}

      <div className="mt-4 space-y-2.5 text-[13.5px]">
        {info?.phone && (
          <a href={`tel:${info.phone}`} className="flex items-center gap-2.5">
            <Phone size={16} className="text-orange shrink-0" /> {info.phone}
          </a>
        )}
        {info?.email && (
          <a href={`mailto:${info.email}`} className="flex items-center gap-2.5 break-all">
            <Mail size={16} className="text-orange shrink-0" /> {info.email}
          </a>
        )}
        {info?.address && (
          <div className="flex items-start gap-2.5">
            <MapPin size={16} className="text-orange shrink-0 mt-0.5" /> {info.address}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="font-extrabold text-[15px] text-white mb-3">{lang === "bn" ? "দ্রুত লিংক" : "Quick Links"}</div>
        <div className="grid grid-cols-2 gap-y-2.5 text-[13.5px] text-white/75">
          {links.map((l, i) =>
            l.url.startsWith("/") ? (
              <Link key={i} to={l.url} onClick={() => window.scrollTo({ top: 0 })}>
                {l.label}
              </Link>
            ) : (
              <a key={i} href={l.url} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            )
          )}
        </div>
      </div>

      {socials.length > 0 && (
        <div className="mt-6">
          <div className="font-extrabold text-[15px] text-white mb-3">{lang === "bn" ? "আমাদের সাথে থাকুন" : "Follow Us"}</div>
          <div className="flex gap-3">
            {socials.map(({ url, icon: Icon, bg, label }) => (
              <a key={label} href={url as string} target="_blank" rel="noreferrer" aria-label={label} className={`press w-11 h-11 rounded-full ${bg} flex items-center justify-center`}>
                <Icon size={20} className="text-white" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-white/15">
        <div className="text-[12.5px] text-white/60 mb-2.5">{lang === "bn" ? "পেমেন্ট নিন যেভাবে:" : "We Accept:"}</div>
        <div className="flex flex-wrap gap-2">
          <span className="text-[11.5px] font-bold bg-white text-teal-dark rounded-md px-3 py-1.5">
            {lang === "bn" ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery"}
          </span>
          {chips.map((c) => (
            <span
              key={c.key}
              className="text-[11.5px] font-bold text-white rounded-md px-3 py-1.5"
              style={{ backgroundColor: c.color ?? "#555" }}
            >
              {lang === "bn" ? c.label_bn : c.label_en}
            </span>
          ))}
        </div>
      </div>

      <div className="text-center text-[12px] text-white/50 mt-6">
        © {new Date().getFullYear()} {name}. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
      </div>
    </footer>
  );
}
