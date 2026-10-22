import React, { useState } from "react";
import { KycPayload, uploadKyc } from "../services/kycService";

interface Props {
  kind: "reseller" | "dropship";
  busy: boolean;
  inpClass: string;
  btnClass: string;
  ghostClass: string;
  onSubmit: (p: KycPayload) => unknown;
  onError: (msg: string) => void;
}

/** রিসেলার ও ড্রপশিপার আবেদনের সম্পূর্ণ তথ্য-ফর্ম (একই ফর্ম দুই জায়গায়) */
export default function KycForm({ kind, busy, inpClass, btnClass, ghostClass, onSubmit, onError }: Props) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [idType, setIdType] = useState<KycPayload["id_doc_type"]>("NID");
  const [idNo, setIdNo] = useState("");
  const [address, setAddress] = useState("");
  const [fb, setFb] = useState("");
  const [pm, setPm] = useState<KycPayload["payout_method"]>("bKash");
  const [pn, setPn] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [selfie, setSelfie] = useState("");
  const [up, setUp] = useState<string | null>(null);

  const lbl = "block text-[11px] font-bold text-slate-500 mt-3 mb-1";
  const digits = (s: string) => s.replace(/[^\d+]/g, "");

  async function pick(tag: "id-front" | "id-back" | "selfie", f: File | undefined) {
    if (!f) return;
    setUp(tag);
    try {
      const p = await uploadKyc(f, tag);
      if (tag === "id-front") setFront(p);
      else if (tag === "id-back") setBack(p);
      else setSelfie(p);
    } catch (e) {
      onError((e as Error)?.message || "আপলোড হয়নি, আবার চেষ্টা করুন");
    } finally {
      setUp(null);
    }
  }

  function submit() {
    if (name.trim().length < 2) return onError("সঠিক নাম লিখুন");
    if (kind === "reseller" && country.trim().length < 2) return onError("দেশ লিখুন (যেমন KSA)");
    if (kind === "dropship" ? !/^01[3-9]\d{8}$/.test(mobile) : !/^[0-9+]{8,15}$/.test(mobile)) return onError("সঠিক মোবাইল নম্বর দিন");
    if (!/^[0-9+]{8,15}$/.test(whatsapp)) return onError("সঠিক WhatsApp নম্বর দিন");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return onError("সঠিক ইমেইল দিন");
    if (idNo.trim().length < 6) return onError("পরিচয়পত্রের নম্বর দিন");
    if (address.trim().length < 8) return onError("পুরো ঠিকানা লিখুন (কমপক্ষে ৮ অক্ষর)");
    if (fb.trim().length < 4) return onError("ফেসবুক প্রোফাইল/পেজের লিংক দিন");
    if (!/^01[3-9]\d{8}$/.test(pn)) return onError("সঠিক bKash/Nagad নম্বর দিন (01XXXXXXXXX)");
    if (!front) return onError("পরিচয়পত্রের সামনের ছবি দিন");
    if (!selfie) return onError("নিজের সেলফি দিন");
    onSubmit({
      name: name.trim(),
      country: country.trim(),
      mobile,
      whatsapp,
      email: email.trim(),
      id_doc_type: idType,
      id_number: idNo.trim(),
      address: address.trim(),
      fb_link: fb.trim(),
      payout_method: pm,
      payout_number: pn,
      id_doc_path: front,
      id_back_path: back,
      selfie_path: selfie
    });
  }

  const photo = (tag: "id-front" | "id-back" | "selfie", label: string, done: string, optional?: boolean) => (
    <label className={ghostClass + " flex items-center justify-between gap-2 cursor-pointer w-full"}>
      <span className="text-xs">
        {label}
        {optional ? " (ঐচ্ছিক)" : ""}
      </span>
      <span className="text-[11px] font-bold">{up === tag ? "আপলোড হচ্ছে..." : done ? "✓ দেওয়া হয়েছে" : "ছবি তুলুন / বাছুন"}</span>
      <input type="file" accept="image/*" hidden onChange={(e) => pick(tag, e.target.files?.[0])} />
    </label>
  );

  return (
    <div>
      <label className={lbl} htmlFor="k-name">পুরো নাম (পরিচয়পত্র অনুযায়ী)</label>
      <input id="k-name" className={inpClass} value={name} onChange={(e) => setName(e.target.value)} />
      {kind === "reseller" && (
        <>
          <label className={lbl} htmlFor="k-country">দেশ</label>
          <input id="k-country" className={inpClass} placeholder="যেমন KSA" value={country} onChange={(e) => setCountry(e.target.value)} />
        </>
      )}
      <label className={lbl} htmlFor="k-mobile">মোবাইল নম্বর</label>
      <input id="k-mobile" className={inpClass} inputMode="numeric" placeholder={kind === "dropship" ? "01XXXXXXXXX" : "দেশের কোডসহ/বাংলাদেশ 01XXXXXXXXX"} value={mobile} onChange={(e) => setMobile(digits(e.target.value))} />
      <label className={lbl} htmlFor="k-wa">WhatsApp নম্বর</label>
      <input id="k-wa" className={inpClass} inputMode="numeric" value={whatsapp} onChange={(e) => setWhatsapp(digits(e.target.value))} />
      <label className={lbl} htmlFor="k-email">ইমেইল</label>
      <input id="k-email" className={inpClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

      <label className={lbl} htmlFor="k-idt">পরিচয়পত্রের ধরন</label>
      <select id="k-idt" className={inpClass} value={idType} onChange={(e) => setIdType(e.target.value as KycPayload["id_doc_type"])}>
        <option value="NID">NID (জাতীয় পরিচয়পত্র)</option>
        <option value="Passport">পাসপোর্ট</option>
        <option value="Iqama">ইকামা</option>
        <option value="Driving">ড্রাইভিং লাইসেন্স</option>
      </select>
      <label className={lbl} htmlFor="k-idn">পরিচয়পত্রের নম্বর</label>
      <input id="k-idn" className={inpClass} value={idNo} onChange={(e) => setIdNo(e.target.value)} />
      <div className="space-y-2 mt-3">
        {photo("id-front", "পরিচয়পত্রের সামনের ছবি", front)}
        {photo("id-back", "পরিচয়পত্রের পেছনের ছবি", back, true)}
        {photo("selfie", "নিজের সেলফি (মুখ স্পষ্ট)", selfie)}
      </div>

      <label className={lbl} htmlFor="k-addr">পুরো ঠিকানা (গ্রাম/এলাকা, থানা, জেলা)</label>
      <textarea id="k-addr" className={inpClass} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
      <label className={lbl} htmlFor="k-fb">ফেসবুক প্রোফাইল / পেজের লিংক</label>
      <input id="k-fb" className={inpClass} placeholder="https://facebook.com/..." value={fb} onChange={(e) => setFb(e.target.value)} />

      <label className={lbl} htmlFor="k-pm">টাকা পাওয়ার মাধ্যম</label>
      <select id="k-pm" className={inpClass} value={pm} onChange={(e) => setPm(e.target.value as KycPayload["payout_method"])}>
        <option value="bKash">বিকাশ</option>
        <option value="Nagad">নগদ</option>
        <option value="Rocket">রকেট</option>
      </select>
      <label className={lbl} htmlFor="k-pn">বিকাশ / নগদ নম্বর</label>
      <input id="k-pn" className={inpClass} inputMode="numeric" maxLength={11} placeholder="01XXXXXXXXX" value={pn} onChange={(e) => setPn(e.target.value.replace(/\D/g, ""))} />

      <button className={btnClass + " w-full mt-4"} disabled={busy || up !== null} onClick={submit}>
        আবেদন করুন
      </button>
      <div className="text-[11px] text-slate-500 mt-2">আপনার ছবি ও তথ্য ব্যক্তিগতভাবে সংরক্ষিত থাকবে, শুধু অ্যাডমিন যাচাইয়ের জন্য দেখতে পারবে।</div>
    </div>
  );
}
