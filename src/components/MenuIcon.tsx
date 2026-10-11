import React from "react";
import {
  Home,
  Search,
  LayoutGrid,
  Package,
  Star,
  User,
  Heart,
  MessageCircle,
  Phone,
  Users,
  Sparkles,
  Palette,
  Info,
  Gift,
  Truck,
  Link as LinkIcon,
  Bell,
  HelpCircle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const MENU_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  home: { icon: Home, label: "হোম" },
  search: { icon: Search, label: "খোঁজা" },
  grid: { icon: LayoutGrid, label: "ক্যাটাগরি" },
  package: { icon: Package, label: "অর্ডার/পণ্য" },
  star: { icon: Star, label: "তারা/রিভিউ" },
  user: { icon: User, label: "অ্যাকাউন্ট" },
  heart: { icon: Heart, label: "ফেভারিট" },
  message: { icon: MessageCircle, label: "মেসেজ/সাপোর্ট" },
  phone: { icon: Phone, label: "ফোন/যোগাযোগ" },
  users: { icon: Users, label: "গ্রুপ" },
  sparkles: { icon: Sparkles, label: "নতুন" },
  palette: { icon: Palette, label: "কালার" },
  info: { icon: Info, label: "তথ্য" },
  gift: { icon: Gift, label: "গিফট" },
  truck: { icon: Truck, label: "ডেলিভারি" },
  bell: { icon: Bell, label: "নোটিশ" },
  help: { icon: HelpCircle, label: "সাহায্য/FAQ" },
  link: { icon: LinkIcon, label: "লিংক" }
};

export default function MenuIcon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  const Ico = (MENU_ICONS[name] ?? MENU_ICONS.link).icon;
  return <Ico size={size} className={className} />;
}
