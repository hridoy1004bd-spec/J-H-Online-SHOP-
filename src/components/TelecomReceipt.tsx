import React, { useState } from "react";
import { Copy, Share2, X } from "lucide-react";
import { SecretRow, copyText, secretToText } from "../services/telecomService";

export interface ReceiptData {
  heading: string; // যেমন "পণ্য কেনার রসিদ"
  title: string; // পণ্যের নাম
  orderNo: string;
  date: string; // কেনার তারিখ-সময়
  amountText: string;
  rows: SecretRow[]; // কপি করার মতো তথ্য (কোড/ইউজারনেম/পাসওয়ার্ড)
  info?: { label: string; value: string }[]; // নম্বর, অপারেটর ইত্যাদি
  note?: string;
  expires?: string | null; // মেয়াদ শেষের তারিখ (থাকলেই দেখাবে)
  status?: string;
}

const TEAL = "#2F7D6D";
const INK = "#1D2733";
const MUTE = "#6B7785";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width <= maxW) {
        line = test;
        continue;
      }
      if (line) out.push(line);
      if (ctx.measureText(word).width <= maxW) {
        line = word;
      } else {
        // লম্বা শব্দ অক্ষর ধরে ভাঙা
        let chunk = "";
        for (const ch of Array.from(word)) {
          if (ctx.measureText(chunk + ch).width > maxW) {
            out.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        line = chunk;
      }
    }
    out.push(line);
  }
  return out;
}

const FONT = '"Noto Sans Bengali","Inter",system-ui,-apple-system,sans-serif';

async function drawReceipt(d: ReceiptData): Promise<Blob> {
  try {
    await (document as any).fonts?.ready;
  } catch {
    /* ignore */
  }
  const W = 720;
  const PAD = 40;
  const inner = W - PAD * 2;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // প্রথমে উচ্চতা মাপি, তারপর আঁকি
  const items: { kind: "t" | "kv" | "gap" | "line" | "box"; text?: string; label?: string; size?: number; bold?: boolean; color?: string; mono?: boolean; lines?: string[]; h: number }[] = [];
  const setFont = (size: number, bold = false, mono = false) => {
    ctx.font = `${bold ? "700 " : "400 "}${size}px ${mono ? "ui-monospace,Menlo,monospace" : FONT}`;
  };
  const addText = (text: string, size: number, bold: boolean, color: string) => {
    setFont(size, bold);
    const lines = wrap(ctx, text, inner);
    items.push({ kind: "t", lines, size, bold, color, h: lines.length * (size + 10) });
  };
  addText(d.title, 34, true, INK);
  addText(`${d.heading} · ${d.orderNo}`, 22, false, MUTE);
  items.push({ kind: "gap", h: 14 });
  const kv = (label: string, value: string, mono = false) => {
    setFont(26, true, mono);
    const lines = wrap(ctx, value, inner - 36);
    items.push({ kind: "kv", label, lines, mono, h: 30 + lines.length * 36 + 22 });
  };
  const meta: { label: string; value: string }[] = [
    { label: "তারিখ", value: d.date },
    { label: "মূল্য", value: d.amountText },
    ...(d.status ? [{ label: "স্ট্যাটাস", value: d.status }] : []),
    ...(d.info ?? [])
  ];
  for (const m of meta) kv(m.label, m.value);
  if (d.rows.length) {
    items.push({ kind: "gap", h: 6 });
    for (const r of d.rows) kv(r.label || "তথ্য", r.value, true);
  }
  if (d.expires) kv("মেয়াদ শেষ", d.expires);
  if (d.note) {
    setFont(22);
    const lines = wrap(ctx, d.note, inner - 36);
    items.push({ kind: "box", lines, h: lines.length * 32 + 36 });
  }

  const HEAD = 150;
  const FOOT = 90;
  const bodyH = items.reduce((s, i) => s + i.h, 0);
  const scale = 2;
  c.width = W * scale;
  c.height = (HEAD + bodyH + FOOT + 40) * scale;
  ctx.scale(scale, scale);
  const H = HEAD + bodyH + FOOT + 40;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, W, HEAD);
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "alphabetic";
  setFont(36, true);
  ctx.fillText("J H Online SHOP", PAD, 66);
  setFont(24);
  ctx.fillText("J H Telecom Reseller", PAD, 106);

  let y = HEAD + 34;
  for (const it of items) {
    if (it.kind === "gap") {
      y += it.h;
    } else if (it.kind === "t") {
      ctx.fillStyle = it.color!;
      setFont(it.size!, it.bold);
      for (const ln of it.lines!) {
        y += it.size! + 4;
        ctx.fillText(ln, PAD, y);
        y += 6;
      }
    } else if (it.kind === "kv") {
      ctx.fillStyle = MUTE;
      setFont(20);
      ctx.fillText(it.label!, PAD, y + 20);
      const boxH = it.lines!.length * 36 + 18;
      ctx.fillStyle = "#EEF6F4";
      ctx.beginPath();
      ctx.roundRect(PAD, y + 30, inner, boxH, 12);
      ctx.fill();
      ctx.fillStyle = INK;
      setFont(26, true, it.mono);
      it.lines!.forEach((ln, i) => ctx.fillText(ln, PAD + 18, y + 30 + 34 + i * 36));
      y += it.h;
    } else if (it.kind === "box") {
      ctx.fillStyle = "#FFF3E6";
      ctx.beginPath();
      ctx.roundRect(PAD, y + 8, inner, it.h - 8, 12);
      ctx.fill();
      ctx.fillStyle = INK;
      setFont(22);
      it.lines!.forEach((ln, i) => ctx.fillText(ln, PAD + 18, y + 8 + 34 + i * 32));
      y += it.h;
    }
  }
  ctx.fillStyle = MUTE;
  setFont(20);
  ctx.fillText("ধন্যবাদ — J H Online SHOP", PAD, H - 40);

  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("ছবি বানানো যায়নি"))), "image/png"));
}

function receiptText(d: ReceiptData): string {
  const lines = [`J H Online SHOP — ${d.heading}`, d.title, `অর্ডার: ${d.orderNo}`, `তারিখ: ${d.date}`, `মূল্য: ${d.amountText}`];
  if (d.status) lines.push(`স্ট্যাটাস: ${d.status}`);
  (d.info ?? []).forEach((i) => lines.push(`${i.label}: ${i.value}`));
  if (d.rows.length) lines.push("", secretToText(d.rows));
  if (d.expires) lines.push("", `মেয়াদ শেষ: ${d.expires}`);
  if (d.note) lines.push("", d.note);
  return lines.join("\n");
}

export default function TelecomReceipt({ data, onClose, onToast }: { data: ReceiptData; onClose: () => void; onToast: (m: string, t?: "success" | "error") => void }) {
  const [busy, setBusy] = useState(false);

  async function copy(s: string) {
    const ok = await copyText(s);
    onToast(ok ? "কপি হয়েছে" : "কপি করা গেল না", ok ? "success" : "error");
  }

  async function shareImage() {
    setBusy(true);
    try {
      const blob = await drawReceipt(data);
      const file = new File([blob], `receipt-${data.orderNo}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: data.title });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        onToast("রসিদ ছবি হিসেবে নামানো হয়েছে", "success");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") onToast((e as Error)?.message || "শেয়ার করা যায়নি", "error");
    } finally {
      setBusy(false);
    }
  }

  async function shareText() {
    const text = receiptText(data);
    try {
      if (navigator.share) await navigator.share({ text, title: data.title });
      else onToast((await copyText(text)) ? "সব তথ্য কপি হয়েছে" : "কপি করা গেল না", "success");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") onToast("শেয়ার করা যায়নি", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-teal text-white rounded-t-3xl px-5 py-4 flex items-start justify-between">
          <div>
            <div className="font-extrabold text-base">J H Online SHOP</div>
            <div className="text-xs text-white/80">J H Telecom Reseller · {data.heading}</div>
          </div>
          <button onClick={onClose} className="press p-1 -mr-1" aria-label="বন্ধ">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div className="font-extrabold text-lg text-ink leading-snug">{data.title}</div>
          <div className="text-xs text-mute mt-0.5">{data.orderNo}</div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-teal-tint rounded-xl p-2.5">
              <div className="text-mute">তারিখ</div>
              <div className="font-bold text-ink">{data.date}</div>
            </div>
            <div className="bg-teal-tint rounded-xl p-2.5">
              <div className="text-mute">মূল্য</div>
              <div className="font-bold text-ink">{data.amountText}</div>
            </div>
            {data.status && (
              <div className="bg-teal-tint rounded-xl p-2.5">
                <div className="text-mute">স্ট্যাটাস</div>
                <div className="font-bold text-ink">{data.status}</div>
              </div>
            )}
            {(data.info ?? []).map((i) => (
              <div key={i.label} className="bg-teal-tint rounded-xl p-2.5">
                <div className="text-mute">{i.label}</div>
                <div className="font-bold text-ink break-all">{i.value}</div>
              </div>
            ))}
          </div>

          {data.rows.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-bold text-mute">আপনার তথ্য</div>
                <button className="press text-[11px] font-bold text-teal-dark flex items-center gap-1" onClick={() => copy(secretToText(data.rows))}>
                  <Copy size={12} /> সব কপি
                </button>
              </div>
              <div className="space-y-2">
                {data.rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 bg-teal-tint rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      {r.label && <div className="text-[10px] font-bold text-mute">{r.label}</div>}
                      <div className="font-mono text-sm font-bold text-ink break-all select-all">{r.value}</div>
                    </div>
                    <button className="press shrink-0 bg-white rounded-lg p-2 text-teal-dark border border-border" onClick={() => copy(r.value)} aria-label="কপি">
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.expires && <div className="mt-3 text-xs font-bold text-orange">মেয়াদ শেষ: {data.expires}</div>}
          {data.note && <div className="mt-3 text-xs bg-orange-tint rounded-xl p-3 text-ink whitespace-pre-line">{data.note}</div>}

          <div className="grid grid-cols-2 gap-2 mt-5">
            <button className="press bg-teal text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60" disabled={busy} onClick={shareImage}>
              <Share2 size={15} /> রসিদ শেয়ার
            </button>
            <button className="press bg-teal-tint text-teal-dark font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-1.5" onClick={shareText}>
              <Copy size={15} /> লেখা শেয়ার
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
