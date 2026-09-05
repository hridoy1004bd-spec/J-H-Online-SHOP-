import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

interface FeaturedBanner {
  id: string;
  image_url: string;
  link_url: string | null;
}

export default function FeaturedBannerSlider() {
  const [banners, setBanners] = useState<FeaturedBanner[]>([]);
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("featured_banners")
      .select("id, image_url, link_url")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setBanners(data as FeaturedBanner[]);
      });
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % banners.length), 1500);
    return () => clearInterval(id);
  }, [banners.length]);

  useEffect(() => {
    trackRef.current?.scrollTo({ left: idx * trackRef.current.clientWidth, behavior: "smooth" });
  }, [idx]);

  if (banners.length === 0) return null;

  return (
    <div className="mx-4 mt-4 rounded-2xl overflow-hidden relative shadow-sm">
      <div
        ref={trackRef}
        onScroll={(e) => {
          const w = e.currentTarget.clientWidth;
          const i = Math.round(e.currentTarget.scrollLeft / w);
          if (i !== idx) setIdx(i);
        }}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {banners.map((b) => (
          <a
            key={b.id}
            href={b.link_url || undefined}
            className="snap-start shrink-0 w-full aspect-square bg-teal-tint block"
          >
            <img src={b.image_url} alt="" className="w-full h-full object-cover" />
          </a>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {banners.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
