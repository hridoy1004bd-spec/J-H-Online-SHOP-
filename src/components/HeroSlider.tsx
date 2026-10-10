import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface Slide {
  id: string;
  image_url: string;
  link_url: string | null;
}

const AUTOPLAY_MS = 4000;

/**
 * হোমের সব ব্যানার একটার পর একটা নিজে নিজে স্লাইড হয়।
 * অ্যাডমিন → ব্যানার ও ফিচার্ড ব্যানার থেকে যোগ/মোছা/বন্ধ করলে এখানে সাথে সাথে বদলায়।
 */
export default function HeroSlider() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [idx, setIdx] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("banners").select("id, image_url, link_url").order("sort_order", { ascending: true }),
      supabase.from("featured_banners").select("id, image_url, link_url").order("sort_order", { ascending: true })
    ]).then(([a, b]) => {
      if (!active) return;
      const list = [...((a.data as Slide[]) ?? []), ...((b.data as Slide[]) ?? [])];
      setSlides(list);
    });
    return () => {
      active = false;
    };
  }, []);

  // next slide every few seconds (restarts after every change, so a manual swipe gets a full pause)
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setTimeout(() => setIdx((i) => (i + 1) % slides.length), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [idx, slides.length]);

  if (slides.length === 0) return null;

  const current = slides[Math.min(idx, slides.length - 1)];
  const ratio = ratios[current.id] ?? 16 / 9;

  function go(delta: number) {
    setIdx((i) => (i + delta + slides.length) % slides.length);
  }

  function open(link: string | null) {
    if (swiped.current || !link) return;
    if (link.startsWith("/")) navigate(link);
    else window.open(link, "_blank", "noopener");
  }

  return (
    <div className="mx-4 mt-4 rounded-2xl overflow-hidden relative shadow-sm bg-teal-tint">
      <div
        className="overflow-hidden"
        style={{ aspectRatio: String(ratio), transition: "aspect-ratio 0.3s ease" }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
          swiped.current = false;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) {
            swiped.current = true;
            go(dx < 0 ? 1 : -1);
            setTimeout(() => {
              swiped.current = false;
            }, 300);
          }
        }}
      >
        <div
          className="flex h-full"
          style={{ transform: `translateX(-${idx * 100}%)`, transition: "transform 0.5s ease" }}
        >
          {slides.map((s) => (
            <div
              key={s.id}
              onClick={() => open(s.link_url)}
              className={`shrink-0 w-full h-full ${s.link_url ? "cursor-pointer" : ""}`}
            >
              <img
                src={s.image_url}
                alt=""
                className="w-full h-full object-cover block"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    const r = img.naturalWidth / img.naturalHeight;
                    setRatios((prev) => (prev[s.id] === r ? prev : { ...prev, [s.id]: r }));
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
