import React from "react";
import { Star } from "lucide-react";

export default function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= value ? "text-[#F5A623] fill-[#F5A623]" : "text-gray-300"} />
      ))}
    </span>
  );
}
