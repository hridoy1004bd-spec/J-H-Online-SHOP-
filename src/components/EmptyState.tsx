import React from "react";
import { LucideIcon } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-16">
      <div className="w-16 h-16 rounded-full bg-teal-tint flex items-center justify-center mb-4">
        <Icon className="text-teal" size={28} />
      </div>
      <div className="font-bold text-ink text-[15px] mb-1">{title}</div>
      {subtitle && <div className="text-mute text-[13px] max-w-xs">{subtitle}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-16">
      <div className="font-bold text-ink text-[15px] mb-3">{t("error")}</div>
      <button onClick={onRetry} className="press bg-teal text-white text-sm font-semibold px-5 py-2 rounded-full">
        {t("retry")}
      </button>
    </div>
  );
}
