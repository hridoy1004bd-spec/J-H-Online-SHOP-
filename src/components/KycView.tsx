import React, { useState } from "react";
import { KycInfo, signedKycUrl } from "../services/kycService";

/** অ্যাডমিনের জন্য: আবেদনকারীর সব তথ্য ও ছবি (ছবি ৫ মিনিটের নিরাপদ লিংকে খোলে) */
export default function KycView({ k }: { k: KycInfo }) {
  const [msg, setMsg] = useState("");
  async function open(path?: string | null) {
    if (!path) return;
    setMsg("");
    const u = await signedKycUrl(path);
    if (u) window.open(u, "_blank");
    else setMsg("ছবি খোলা গেল না");
  }
  const rows: [string, string | null | undefined][] = [
    ["ইমেইল", k.email],
    ["WhatsApp", k.whatsapp],
    ["ঠিকানা", k.address ?? k.address_bd],
    [`${k.id_doc_type ?? "পরিচয়পত্র"} নম্বর`, k.id_number],
    ["ফেসবুক", k.fb_link],
    ["টাকা পাওয়ার মাধ্যম", k.payout_method ? `${k.payout_method} · ${k.payout_number ?? ""}` : null]
  ];
  const has = rows.some(([, v]) => v) || k.id_doc_path || k.selfie_path;
  if (!has) return <div className="text-[11px] text-mute mb-2">এই আবেদনে বিস্তারিত তথ্য নেই (আগের আবেদন)।</div>;
  const b = "press text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-border bg-white";
  return (
    <div className="bg-teal-tint rounded-xl p-3 mb-3 text-xs space-y-1">
      <div className="font-extrabold text-teal-dark mb-1">আবেদনের তথ্য</div>
      {rows.map(([l, v]) =>
        v ? (
          <div key={l} className="flex gap-2">
            <span className="text-mute shrink-0">{l}:</span>
            <span className="font-semibold break-all">{v}</span>
          </div>
        ) : null
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {k.id_doc_path && <button className={b} onClick={() => open(k.id_doc_path)}>পরিচয়পত্র (সামনে)</button>}
        {k.id_back_path && <button className={b} onClick={() => open(k.id_back_path)}>পরিচয়পত্র (পেছনে)</button>}
        {k.selfie_path && <button className={b} onClick={() => open(k.selfie_path)}>সেলফি</button>}
      </div>
      {msg && <div className="text-red-600">{msg}</div>}
    </div>
  );
}
