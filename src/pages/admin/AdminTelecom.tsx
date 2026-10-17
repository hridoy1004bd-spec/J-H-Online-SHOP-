import React from "react";
import { Smartphone } from "lucide-react";

export default function AdminTelecom() {
  return (
    <div className="max-w-lg">
      <h1 className="font-extrabold text-lg mb-4 flex items-center gap-2">
        <Smartphone size={20} className="text-teal" /> J H Telecom Reseller
      </h1>
      <div className="bg-white border border-border rounded-2xl p-5 text-sm text-mute">
        এই পেইজ এখন ফাঁকা। পরে এখানে রিসেলার, রিচার্জ ও হিসাবের কাজ যুক্ত হবে।
      </div>
    </div>
  );
}
