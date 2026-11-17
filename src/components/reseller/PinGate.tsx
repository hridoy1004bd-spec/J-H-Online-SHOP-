import React, { useState } from "react";
import { Lock } from "lucide-react";
import { verifyPin, svcErr } from "../../services/resellerService";
import { PinError, telErr, telRpc } from "../../services/telecomService";

const BLUE = "#2b4797";

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, ${BLUE} 0%, #3d62d6 46%, #f4f6fb 46%)` }}>
      <div className="px-6 pt-14 pb-8 text-white text-center">
        <div className="w-16 h-16 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3">
          <Lock size={28} />
        </div>
        <div className="text-xl font-extrabold">{title}</div>
        <div className="text-xs opacity-90 mt-1">{sub}</div>
      </div>
      <div className="px-4 -mt-2 max-w-md w-full mx-auto">{children}</div>
    </div>
  );
}

/** লগইনের পর পিন দিয়ে আনলক */
export function LockScreen({ name, onUnlock, onHelp, onLogout }: { name: string; onUnlock: () => void; onHelp: () => void; onLogout: () => void }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    setErr("");
    try {
      const r = await verifyPin(pin);
      if (!r.ok) throw new PinError(r.error ?? "PIN_WRONG", r.left);
      onUnlock();
    } catch (e) {
      setErr(telErr(e));
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="পিন দিয়ে প্রবেশ করুন" sub={`স্বাগতম, ${name}`}>
      <div className="bg-white rounded-3xl p-5 shadow-lg">
        <label className="text-xs font-bold text-mute block mb-2">আপনার পিন</label>
        <input
          className="input text-center tracking-[0.6em] text-2xl"
          type="password"
          inputMode="numeric"
          autoFocus
          maxLength={6}
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && pin.length >= 4 && !busy && go()}
        />
        {err && <div className="text-xs font-bold text-red-600 mt-2 text-center">{err}</div>}
        <button className="press w-full rounded-2xl text-white font-extrabold py-3.5 mt-4 disabled:opacity-50" style={{ background: BLUE }} disabled={busy || pin.length < 4} onClick={go}>
          {busy ? "যাচাই হচ্ছে…" : "প্রবেশ করুন"}
        </button>
        <button className="press w-full text-sm font-bold mt-4" style={{ color: BLUE }} onClick={onHelp}>
          পিন ভুলে গেছেন? অ্যাডমিনকে জানান
        </button>
        <button className="press w-full text-xs text-mute font-semibold mt-3" onClick={onLogout}>
          অন্য অ্যাকাউন্টে লগইন / লগআউট
        </button>
      </div>
    </Shell>
  );
}

/** প্রথমবার: পিন সেট না করা পর্যন্ত ভেতরে ঢোকা যাবে না */
export function SetPinScreen({ name, onDone, onLogout }: { name: string; onDone: () => void; onLogout: () => void }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (a !== b) return setErr("দুইবার একই পিন দিন");
    setBusy(true);
    setErr("");
    try {
      const res = await telRpc<{ ok: boolean; error?: string }>("telecom_set_pin", { p_new: a, p_old: null });
      if (!res || res.ok === false) throw new PinError(res?.error ?? "PIN_WRONG");
      onDone();
    } catch (e) {
      setErr(svcErr(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell title="নিজের পিন সেট করুন" sub={`${name} — ৪ থেকে ৬ সংখ্যার পিন দিন`}>
      <div className="bg-white rounded-3xl p-5 shadow-lg">
        <input className="input text-center tracking-[0.6em] text-xl mb-3" type="password" inputMode="numeric" maxLength={6} placeholder="নতুন পিন" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ""))} />
        <input className="input text-center tracking-[0.6em] text-xl" type="password" inputMode="numeric" maxLength={6} placeholder="আবার দিন" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ""))} />
        {err && <div className="text-xs font-bold text-red-600 mt-2 text-center">{err}</div>}
        <button className="press w-full rounded-2xl text-white font-extrabold py-3.5 mt-4 disabled:opacity-50" style={{ background: BLUE }} disabled={busy || a.length < 4} onClick={go}>
          {busy ? "অপেক্ষা করুন…" : "পিন সেট করে প্রবেশ করুন"}
        </button>
        <div className="text-[11px] text-mute mt-3 text-center">এই পিন প্রতিবার লগইনের পর এবং প্রতিটি লেনদেনে চাওয়া হবে। কাউকে বলবেন না।</div>
        <button className="press w-full text-xs text-mute font-semibold mt-3" onClick={onLogout}>
          লগআউট
        </button>
      </div>
    </Shell>
  );
}
