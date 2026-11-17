import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, MessageCircle } from "lucide-react";
import { HELP_TYPES, HelpType, adminWhatsapp, buildHelpMessage } from "../../services/resellerService";
import { copyText } from "../../services/telecomService";

interface Props {
  defaultName?: string;
  defaultMobile?: string;
  defaultStore?: string;
  onBack: () => void;
  onToast: (m: string, t?: "success" | "error") => void;
}

const BLUE = "#2b4797";

/** পিন/পাসওয়ার্ড ভুলে গেলে: তথ্য দিলে সুন্দর বার্তা তৈরি হয়, WhatsApp-এ অ্যাডমিনের কাছে যায় */
export default function HelpRequest({ defaultName = "", defaultMobile = "", defaultStore = "", onBack, onToast }: Props) {
  const [name, setName] = useState(defaultName);
  const [mobile, setMobile] = useState(defaultMobile);
  const [store, setStore] = useState(defaultStore);
  const [type, setType] = useState<HelpType>("pin");
  const [note, setNote] = useState("");
  const [wa, setWa] = useState("");

  useEffect(() => {
    adminWhatsapp().then(setWa);
  }, []);

  const msg = useMemo(() => buildHelpMessage({ name, mobile, store, type, note }), [name, mobile, store, type, note]);
  const ok = name.trim().length >= 2 && /^01[3-9]\d{8}$/.test(mobile) && store.trim().length >= 2;
  const link = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}` : "";

  return (
    <div className="px-4 pt-4 pb-10 max-w-md mx-auto">
      <button className="press flex items-center gap-2 text-sm font-bold mb-3" style={{ color: BLUE }} onClick={onBack}>
        <ArrowLeft size={18} /> ফিরে যান
      </button>
      <div className="rounded-3xl p-5 text-white mb-4" style={{ background: `linear-gradient(135deg, ${BLUE}, #3d62d6)` }}>
        <div className="text-lg font-extrabold">সাহায্যের আবেদন</div>
        <div className="text-xs opacity-90 mt-1">পিন বা পাসওয়ার্ড ভুলে গেছেন? নিচের তথ্য দিন। একটি সুন্দর বার্তা তৈরি হবে, WhatsApp বাটনে চাপলেই অ্যাডমিনের কাছে চলে যাবে।</div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-4 mb-3">
        <label className="text-xs font-bold text-mute block mb-1">আপনার নাম</label>
        <input className="input mb-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: হৃদয় হোসেন" />
        <label className="text-xs font-bold text-mute block mb-1">মোবাইল নম্বর (লগইনের নম্বর)</label>
        <input className="input mb-3" inputMode="numeric" maxLength={11} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} placeholder="01XXXXXXXXX" />
        <label className="text-xs font-bold text-mute block mb-1">স্টোর / রিসেলারের নাম</label>
        <input className="input mb-3" value={store} onChange={(e) => setStore(e.target.value)} placeholder="যেমন: HRIDOY STOR" />
        <label className="text-xs font-bold text-mute block mb-1">কী প্রয়োজন?</label>
        <div className="grid gap-2 mb-3">
          {HELP_TYPES.map((t) => (
            <button
              key={t.k}
              onClick={() => setType(t.k)}
              className={`press text-left rounded-xl px-3 py-2.5 text-sm font-semibold border-2 ${type === t.k ? "text-white" : "border-border bg-white"}`}
              style={type === t.k ? { background: BLUE, borderColor: BLUE } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="text-xs font-bold text-mute block mb-1">অতিরিক্ত কিছু জানাতে চাইলে (ঐচ্ছিক)</label>
        <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="যেমন: নতুন ফোন নিয়েছি, পিন মনে নেই" />
      </div>

      <div className="bg-white border border-border rounded-2xl p-4 mb-3">
        <div className="font-extrabold text-sm mb-2">আপনার বার্তা</div>
        <div className="rounded-xl bg-[#e7f7ec] border border-[#bfe8cb] p-3 text-[13px] leading-relaxed whitespace-pre-line">{msg}</div>
        <div className="grid gap-2 mt-3">
          {link ? (
            <a
              href={ok ? link : undefined}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                if (!ok) {
                  e.preventDefault();
                  onToast("নাম, মোবাইল নম্বর ও স্টোরের নাম দিন", "error");
                }
              }}
              className={`press flex items-center justify-center gap-2 rounded-2xl py-3.5 font-extrabold text-white ${ok ? "bg-[#25D366]" : "bg-[#25D366]/50"}`}
            >
              <MessageCircle size={20} /> WhatsApp-এ অ্যাডমিনকে পাঠান
            </a>
          ) : (
            <div className="text-xs text-mute">WhatsApp নম্বর পাওয়া যায়নি। বার্তা কপি করে অ্যাডমিনকে পাঠান।</div>
          )}
          <button
            className="press flex items-center justify-center gap-2 rounded-2xl py-3 font-bold border border-border bg-white"
            onClick={async () => onToast((await copyText(msg)) ? "বার্তা কপি হয়েছে" : "কপি করা গেল না", "success")}
          >
            <Copy size={16} /> বার্তা কপি করুন
          </button>
        </div>
        <div className="text-[11px] text-mute mt-2">নিরাপত্তার জন্য এখানে কখনো পিন বা পাসওয়ার্ড লিখবেন না। অ্যাডমিন যাচাই করে রিসেট করে দেবেন।</div>
      </div>
    </div>
  );
}
