import React, { useEffect, useState } from "react";

const CITIES = ["Cumilla", "Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal", "Rangpur", "Mymensingh"];
const CITY_BN: Record<string, string> = { Cumilla: "কুমিল্লা", Dhaka: "ঢাকা", Chittagong: "চট্টগ্রাম", Sylhet: "সিলেট", Rajshahi: "রাজশাহী", Khulna: "খুলনা", Barisal: "বরিশাল", Rangpur: "রংপুর", Mymensingh: "ময়মনসিংহ" };
const NAMES: [string, string][] = [
  ["Fajr", "ফজর"],
  ["Sunrise", "সূর্যোদয়"],
  ["Dhuhr", "যোহর"],
  ["Asr", "আসর"],
  ["Maghrib", "মাগরিব"],
  ["Isha", "এশা"]
];

function to12(t: string): string {
  const [h, m] = t.split(" ")[0].split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
}
function mins(t: string): number {
  const [h, m] = t.split(" ")[0].split(":").map(Number);
  return h * 60 + m;
}

export default function Namaz() {
  const [city, setCity] = useState(() => {
    try {
      return localStorage.getItem("jh_namaz_city") || "Cumilla";
    } catch {
      return "Cumilla";
    }
  });
  const [times, setTimes] = useState<Record<string, string> | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    setTimes(null);
    setErr("");
    fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Bangladesh&method=1&school=1`)
      .then((r) => r.json())
      .then((j) => {
        if (dead) return;
        if (j?.data?.timings) setTimes(j.data.timings);
        else setErr("সময় আনা যায়নি");
      })
      .catch(() => !dead && setErr("ইন্টারনেট সংযোগ দেখুন, সময় আনা যায়নি"));
    try {
      localStorage.setItem("jh_namaz_city", city);
    } catch {
      /* ignore */
    }
    return () => {
      dead = true;
    };
  }, [city]);

  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const next = times ? NAMES.filter(([k]) => k !== "Sunrise").find(([k]) => mins(times[k]) > nowM)?.[0] ?? "Fajr" : "";

  return (
    <div className="bg-white border border-border rounded-2xl p-4 mb-3">
      <div className="font-extrabold text-sm mb-3">🕌 নামাজের সময়সূচি</div>
      <select className="input mb-3" value={city} onChange={(e) => setCity(e.target.value)}>
        {CITIES.map((c) => (
          <option key={c} value={c}>
            {CITY_BN[c]} ({c})
          </option>
        ))}
      </select>
      {err && <div className="text-xs text-red-600 font-bold">{err}</div>}
      {!times && !err && <div className="text-xs text-mute">লোড হচ্ছে…</div>}
      {times &&
        NAMES.map(([k, bn]) => (
          <div key={k} className={`flex items-center justify-between rounded-xl px-3 py-3 mb-1.5 ${next === k ? "bg-[#2b4797] text-white" : "bg-teal-tint"}`}>
            <span className="font-bold text-sm">
              {bn} {next === k && <span className="text-[10px] opacity-90">· পরবর্তী</span>}
            </span>
            <span className="font-extrabold">{to12(times[k])}</span>
          </div>
        ))}
      <div className="text-[10px] text-mute mt-2">সূত্র: Aladhan (করাচি পদ্ধতি, হানাফি আসর)। স্থানীয় মসজিদের সময়ের সাথে ১–২ মিনিট পার্থক্য হতে পারে।</div>
    </div>
  );
}
