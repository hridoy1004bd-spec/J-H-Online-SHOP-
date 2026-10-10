import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface Slide {
  id: string;
  image_url: string;
  link_url: string | null;
}

const AUTOPLAY_MS = 4000;

/**
 * ব্যানার একটার পর একটা নিজে নিজে স্লাইড হয়, আঙুলে টেনেও সরানো যায়।
 * table = "banners" (উপরের ব্যানার) অথবা "featured_banners" (নিচের অর্ডার ব্যানার, চাপলে পণ্যে যায়)।
 * অ্যাডমিন থেকে যোগ/মোছা/বন্ধ করলে এখানে সাথে সাথে বদলায়।
 */
export default function HeroSlider({ table = "banners" }: { table?: "banners" | "featured_banners" }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [idx, setIdx] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);

  useEffect(() => {
    let active = true;
    supabase
      .from(table)
      .select("id, image_url, link_url")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (active) setSlides((data as Slide[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, [table]);

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

  // A swipe must never count as a tap on the link underneath.
  function blockIfSwiped(e: React.MouseEvent) {
    if (swiped.current) e.preventDefault();
  }

  return (
    <div className="mx-4 mt-4 rounded-2xl overflow-hidden relative shadow-sm bg-teal-tint">
      <div
        className="overflow-hidden relative"
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
          className="absolute inset-0 flex"
          style={{ transform: `translateX(-${idx * 100}%)`, transition: "transform 0.5s ease" }}
        >
          {slides.map((s) => {
            const img = (
              <img
                src={s.image_url}
                alt=""
                className="w-full h-full object-cover block"
                draggable={false}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  if (el.naturalWidth && el.naturalHeight) {
                    const r = el.naturalWidth / el.naturalHeight;
                    setRatios((prev) => (prev[s.id] === r ? prev : { ...prev, [s.id]: r }));
                  }
                }}
              />
            );
            const cls = "block shrink-0 w-full h-full";
            if (s.link_url && s.link_url.startsWith("/")) {
              return (
                <Link
                  key={s.id}
                  to={s.link_url}
                  onClick={(e) => {
                    blockIfSwiped(e);
                    if (!swiped.current) window.scrollTo({ top: 0 });
                  }}
                  className={cls}
                >
                  {img}
                </Link>
              );
            }
            if (s.link_url) {
              return (
                <a key={s.id} href={s.link_url} target="_blank" rel="noreferrer" onClick={blockIfSwiped} className={cls}>
                  {img}
                </a>
              );
            }
            return (
              <div key={s.id} className={cls}>
                {img}
              </div>
            );
          })}
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
