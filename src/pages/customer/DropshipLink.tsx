import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { dsErr, dsRpc, tk } from "../../services/dropshipService";

interface PubProduct {
  shop_name: string;
  product_id: string;
  name: string;
  description: string;
  image: string | null;
  price: number;
  delivery: number;
}

const inp = "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500";

export default function DropshipLink() {
  const { code = "", pid = "" } = useParams();
  const [p, setP] = useState<PubProduct | null | undefined>(undefined);
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [addr, setAddr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [more, setMore] = useState(false);

  useEffect(() => {
    let alive = true;
    dsRpc<PubProduct | null>("ds_public_product", { p_code: code, p_product: pid })
      .then((d) => alive && setP(d))
      .catch(() => alive && setP(null));
    return () => {
      alive = false;
    };
  }, [code, pid]);

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      const no = await dsRpc<string>("ds_public_order", {
        p_code: code,
        p_product: pid,
        p_qty: qty,
        p_name: name,
        p_mobile: mobile,
        p_address: addr,
        p_note: note,
        p_variant: variant
      });
      setDone(no);
    } catch (e) {
      setErr(dsErr(e));
    } finally {
      setBusy(false);
    }
  }

  if (p === undefined) return <div className="p-8 text-center text-sm text-slate-500">লোড হচ্ছে…</div>;
  if (p === null) return <div className="p-8 text-center text-sm text-slate-600">এই লিংকটি আর চালু নেই। যিনি পাঠিয়েছেন তাঁর সাথে যোগাযোগ করুন।</div>;

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={56} />
        <h1 className="text-xl font-extrabold">অর্ডার সম্পন্ন হয়েছে</h1>
        <p className="mt-2 text-sm text-slate-600">আপনার অর্ডার নম্বর</p>
        <p className="mt-1 select-all text-2xl font-extrabold text-emerald-700">{done}</p>
        <p className="mt-4 text-sm text-slate-600">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করে অর্ডার নিশ্চিত করব। পণ্য হাতে পেয়ে টাকা দেবেন।</p>
      </div>
    );
  }

  const total = p.price * qty + Number(p.delivery);
  const desc = p.description || "";
  return (
    <div className="mx-auto max-w-md px-4 py-5">
      {p.image && <img src={p.image} alt={p.name} className="mb-4 h-72 w-full rounded-2xl object-cover" />}
      <h1 className="text-lg font-extrabold leading-snug">{p.name}</h1>
      <p className="mt-1 text-2xl font-extrabold text-emerald-700">{tk(p.price)}</p>
      {desc && (
        <div className="mt-3 text-sm text-slate-600">
          <p className={`whitespace-pre-line ${more ? "" : "line-clamp-4"}`}>{desc}</p>
          <button className="mt-1 text-xs font-bold text-emerald-700" onClick={() => setMore(!more)}>
            {more ? "কম দেখুন" : "আরও দেখুন"}
          </button>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-bold">অর্ডার করুন (ক্যাশ অন ডেলিভারি)</h2>
        <div className="mb-2 grid grid-cols-3 gap-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-2">
            <button className="px-2 py-2 text-lg font-bold" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="কমান">−</button>
            <b>{qty}</b>
            <button className="px-2 py-2 text-lg font-bold" onClick={() => setQty(Math.min(50, qty + 1))} aria-label="বাড়ান">+</button>
          </div>
          <input className={inp + " col-span-2"} placeholder="সাইজ / কালার (লিখুন)" value={variant} onChange={(e) => setVariant(e.target.value)} />
        </div>
        <input className={inp + " mb-2"} placeholder="আপনার নাম" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inp + " mb-2"} inputMode="numeric" maxLength={11} placeholder="মোবাইল নম্বর 01XXXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} />
        <textarea className={inp + " mb-2"} rows={3} placeholder="পুরো ঠিকানা (গ্রাম/এলাকা, থানা, জেলা)" value={addr} onChange={(e) => setAddr(e.target.value)} />
        <input className={inp + " mb-3"} placeholder="নোট (ঐচ্ছিক)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between"><span>পণ্যের দাম</span><b>{tk(p.price * qty)}</b></div>
          <div className="flex justify-between"><span>ডেলিভারি চার্জ</span><b>{tk(p.delivery)}</b></div>
          <div className="mt-1 flex justify-between border-t pt-1"><span>মোট (হাতে পেয়ে দেবেন)</span><b>{tk(total)}</b></div>
        </div>
        {err && <p className="mb-2 text-sm font-bold text-red-600">{err}</p>}
        <button className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-extrabold text-white disabled:opacity-60" disabled={busy} onClick={submit}>
          {busy ? "অপেক্ষা করুন…" : "অর্ডার নিশ্চিত করুন"}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">{p.shop_name}</p>
    </div>
  );
}
