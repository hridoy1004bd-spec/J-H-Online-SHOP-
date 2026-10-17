import React from "react";
import { Smartphone } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

export default function TelecomReseller() {
  const { lang } = useLanguage();
  return (
    <div className="px-4 pt-10 pb-10 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-tint flex items-center justify-center mx-auto mb-4">
        <Smartphone className="text-teal" size={30} />
      </div>
      <h1 className="font-extrabold text-lg mb-2">J H Telecom Reseller</h1>
      <p className="text-mute text-sm">
        {lang === "en" ? "This service is coming soon." : "এই সেবা খুব শীঘ্রই চালু হবে।"}
      </p>
    </div>
  );
}
