import React from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "../utils/favorites";
import { useLanguage } from "../i18n/LanguageContext";
import { useToast } from "../contexts/ToastContext";

export default function FavoriteButton({ productId, className = "", size = 16 }: { productId: string; className?: string; size?: number }) {
  const { isFav, toggle } = useFavorites();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const fav = isFav(productId);

  return (
    <button
      type="button"
      aria-label="Favourite"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        const added = toggle(productId);
        showToast(
          added
            ? lang === "bn" ? "পছন্দের তালিকায় যোগ হয়েছে" : "Added to favourites"
            : lang === "bn" ? "পছন্দের তালিকা থেকে সরানো হয়েছে" : "Removed from favourites"
        );
      }}
      className={`press rounded-full bg-white/90 shadow flex items-center justify-center w-8 h-8 ${className}`}
    >
      <Heart size={size} className={fav ? "text-red-500" : "text-gray-500"} fill={fav ? "#EF4444" : "none"} />
    </button>
  );
}
