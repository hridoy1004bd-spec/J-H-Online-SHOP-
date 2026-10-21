import { autoPair } from "../../services/translateService";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Upload, Plus, Trash2, Copy, Link as LinkIcon } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { uploadService } from "../../services/uploadService";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import type { Category, Product } from "../../types";

interface VariantRow {
  id: string | null;
  size: string;
  color: string;
  quantity: number;
  imageUrl: string;
  inventoryId: string | null;
  isNew?: boolean;
}

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nameEn, setNameEn] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([]);

  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [variantSaving, setVariantSaving] = useState(false);
  const [bulkSizes, setBulkSizes] = useState("");
  const [bulkColors, setBulkColors] = useState("");
  const [bulkQty, setBulkQty] = useState("10");
  const [bulkSaving, setBulkSaving] = useState(false);
  // ছবি থেকে অপশন (রঙ/ডিজাইন) বানানোর টুল
  const [optSel, setOptSel] = useState<Record<string, string>>({});
  const [optSizes, setOptSizes] = useState("");
  const [optQty, setOptQty] = useState("10");
  const [optSaving, setOptSaving] = useState(false);

  const productPath = id ? `/product/${id}` : "";

  async function loadAll() {
    if (!id) return;
    const [{ data: p }, { data: cats }] = await Promise.all([
      supabase
        .from("products")
        .select("*, product_images(*), product_variants(*, inventory(*))")
        .eq("id", id)
        .single(),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order")
    ]);
    if (p) {
      setProduct(p as unknown as Product);
      setNameEn(p.name_en);
      setNameBn(p.name_bn);
      setDesc(p.description_en ?? "");
      setCategoryId(p.category_id ?? "");
      setOldPrice(String(p.old_price));
      setPrice(String(p.current_price));
      setIsActive(p.is_active);

      const vRows: VariantRow[] = ((p as any).product_variants ?? []).map((v: any) => {
        const inv = (v.inventory ?? [])[0];
        return {
          id: v.id,
          size: v.size ?? "",
          color: v.color ?? "",
          quantity: inv ? Math.max(0, inv.quantity - inv.reserved) : 0,
          imageUrl: v.image_url ?? "",
          inventoryId: inv?.id ?? null
        };
      });
      setVariants(vRows);
    }
    setCategories((cats as Category[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function copyProductLink() {
    navigator.clipboard?.writeText(productPath);
    showToast(lang === "en" ? "Product link copied" : "প্রোডাক্ট লিংক কপি হয়েছে", "success");
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next: { file: File; preview: string }[] = [];
    Array.from(fileList).forEach((file) => {
      const err = uploadService.validate(file);
      if (err) return showToast(err, "error");
      next.push({ file, preview: URL.createObjectURL(file) });
    });
    setNewImages((prev) => [...prev, ...next]);
  }

  async function save() {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name_en: nameEn,
          name_bn: nameBn,
          description_en: desc,
          description_bn: desc,
          category_id: categoryId || null,
          old_price: Number(oldPrice),
          current_price: Number(price),
          is_active: isActive
        })
        .eq("id", id);
      if (error) throw error;

      const existingCount = product?.product_images?.length ?? 0;
      for (let i = 0; i < newImages.length; i++) {
        const { url, thumbnailUrl } = await uploadService.uploadProductImage(newImages[i].file, id);
        await supabase.from("product_images").insert({
          product_id: id,
          url,
          thumbnail_url: thumbnailUrl,
          is_main: existingCount === 0 && i === 0,
          sort_order: existingCount + i
        });
      }

      showToast(t("save") + " ✓");
      navigate("/admin/products");
    } catch (err: any) {
      showToast(err.message || t("error"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeExistingImage(imageId: string) {
    await supabase.from("product_images").delete().eq("id", imageId);
    setProduct((p) => (p ? { ...p, product_images: p.product_images?.filter((i) => i.id !== imageId) } : p));
  }

  function addVariantRow() {
    setVariants((v) => [...v, { id: null, size: "", color: "", quantity: 0, imageUrl: "", inventoryId: null, isNew: true }]);
  }

  function updateVariantRow(idx: number, patch: Partial<VariantRow>) {
    setVariants((v) => v.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  async function saveVariantRow(idx: number) {
    if (!id) return;
    const row = variants[idx];
    setVariantSaving(true);
    try {
      let variantId = row.id;
      if (!variantId) {
        const { data, error } = await supabase
          .from("product_variants")
          .insert({ product_id: id, size: row.size || null, color: row.color || null, image_url: row.imageUrl || null })
          .select()
          .single();
        if (error) throw error;
        variantId = data.id;
      } else {
        const { error } = await supabase
          .from("product_variants")
          .update({ size: row.size || null, color: row.color || null, image_url: row.imageUrl || null })
          .eq("id", variantId);
        if (error) throw error;
      }

      if (row.inventoryId) {
        const { error } = await supabase
          .from("inventory")
          .update({ quantity: row.quantity, reserved: 0 })
          .eq("id", row.inventoryId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("inventory")
          .insert({ product_id: id, variant_id: variantId, quantity: row.quantity, reserved: 0 })
          .select()
          .single();
        if (error) throw error;
        updateVariantRow(idx, { inventoryId: data.id });
      }

      // একই রঙের সব সাইজে একই ছবি প্রযোজ্য
      if (row.color && row.imageUrl) {
        await supabase
          .from("product_variants")
          .update({ image_url: row.imageUrl })
          .eq("product_id", id)
          .eq("color", row.color);
        setVariants((vs) => vs.map((r) => (r.color === row.color ? { ...r, imageUrl: row.imageUrl } : r)));
      }
      updateVariantRow(idx, { id: variantId, isNew: false });
      showToast(lang === "en" ? "Variant saved" : "ভ্যারিয়েন্ট সেভ হয়েছে", "success");
    } catch (err: any) {
      showToast(err.message || t("error"), "error");
    } finally {
      setVariantSaving(false);
    }
  }

  async function uploadVariantImage(idx: number, file: File | undefined) {
    if (!file || !id) return;
    const err = uploadService.validate(file);
    if (err) return showToast(err, "error");
    try {
      const { url } = await uploadService.uploadProductImage(file, id);
      updateVariantRow(idx, { imageUrl: url });
      showToast(lang === "en" ? "Image added — press Save" : "ছবি যোগ হয়েছে — সেভ চাপুন", "success");
    } catch (e: any) {
      showToast(e.message || t("error"), "error");
    }
  }

  async function pickColorImage(color: string, url: string) {
    if (!id) return;
    const { error } = await supabase.from("product_variants").update({ image_url: url }).eq("product_id", id).eq("color", color);
    if (error) return showToast(error.message, "error");
    setVariants((vs) => vs.map((r) => (r.color === color ? { ...r, imageUrl: url } : r)));
    showToast(lang === "en" ? `${color}: image set ✓` : `${color}: ছবি বসেছে ✓`, "success");
  }

  async function clearColorImage(color: string) {
    if (!id) return;
    const { error } = await supabase.from("product_variants").update({ image_url: null }).eq("product_id", id).eq("color", color);
    if (error) return showToast(error.message, "error");
    setVariants((vs) => vs.map((r) => (r.color === color ? { ...r, imageUrl: "" } : r)));
  }

  function toVariantRows(list: any[]): VariantRow[] {
    return (list ?? []).map((v: any) => {
      const inv = (v.inventory ?? [])[0];
      return {
        id: v.id,
        size: v.size ?? "",
        color: v.color ?? "",
        quantity: inv ? Math.max(0, inv.quantity - inv.reserved) : 0,
        imageUrl: v.image_url ?? "",
        inventoryId: inv?.id ?? null
      };
    });
  }

  async function reloadVariants() {
    if (!id) return;
    const { data } = await supabase.from("product_variants").select("*, inventory(*)").eq("product_id", id);
    setVariants(toVariantRows((data as any[]) ?? []));
  }

  // একসাথে সাইজ × কালার যোগ করুন (যেগুলো আগে থেকেই আছে সেগুলো বাদ যাবে, কিছু মুছবে না)
  async function addBulk() {
    if (!id) return;
    const split = (x: string) => x.split(",").map((p) => p.trim()).filter(Boolean);
    const sizeList = split(bulkSizes);
    const colorList = split(bulkColors);
    if (sizeList.length === 0 && colorList.length === 0) {
      return showToast(lang === "en" ? "Enter sizes and/or colors" : "সাইজ বা কালার লিখুন", "error");
    }
    const combos: { size: string | null; color: string | null }[] =
      sizeList.length === 0
        ? colorList.map((c) => ({ size: null, color: c }))
        : colorList.length === 0
        ? sizeList.map((s) => ({ size: s, color: null }))
        : sizeList.flatMap((s) => colorList.map((c) => ({ size: s, color: c })));
    const key = (sz: string | null, co: string | null) => `${(sz ?? "").trim().toLowerCase()}|${(co ?? "").trim().toLowerCase()}`;
    const have = new Set(variants.map((v) => key(v.size, v.color)));
    const todo = combos.filter((c) => !have.has(key(c.size, c.color)));
    if (todo.length === 0) {
      return showToast(lang === "en" ? "All of these already exist" : "এগুলো সব আগেই আছে", "error");
    }
    const qty = Math.max(0, Number(bulkQty) || 0);
    setBulkSaving(true);
    try {
      for (const c of todo) {
        const sameColorImg = c.color
          ? variants.find((v) => v.color.trim().toLowerCase() === c.color!.toLowerCase() && v.imageUrl)?.imageUrl ?? null
          : null;
        const { data: v, error } = await supabase
          .from("product_variants")
          .insert({ product_id: id, size: c.size, color: c.color, image_url: sameColorImg })
          .select()
          .single();
        if (error) throw error;
        const { error: e2 } = await supabase
          .from("inventory")
          .insert({ product_id: id, variant_id: v.id, quantity: qty, reserved: 0 });
        if (e2) throw e2;
      }
      setBulkSizes("");
      setBulkColors("");
      await reloadVariants();
      showToast(lang === "en" ? `${todo.length} added` : `${todo.length}টি যোগ হয়েছে`, "success");
    } catch (err: any) {
      await reloadVariants();
      showToast(err.message || t("error"), "error");
    } finally {
      setBulkSaving(false);
    }
  }

  // গ্যালারির ছবি বেছে প্রতিটার নাম দিন → প্রতিটা ছবি একটা রঙ/ডিজাইন অপশন হয়ে যায় (ছবি + স্টক সহ)
  async function pairName(side: "bn" | "en") {
    const r = await autoPair(side, nameBn, nameEn);
    if (r?.bn !== undefined) setNameBn(r.bn);
    if (r?.en !== undefined) setNameEn(r.en);
  }

  async function createOptionsFromPhotos() {
    if (!id) return;
    const chosen = (product?.product_images ?? []).filter((im) => optSel[im.id] !== undefined);
    if (chosen.length === 0) return showToast(lang === "en" ? "Select at least one photo" : "অন্তত একটি ছবি বেছে নিন", "error");
    const sizeList = optSizes.split(",").map((x) => x.trim()).filter(Boolean);
    const existingSizes = Array.from(new Set(variants.map((v) => v.size.trim()).filter(Boolean)));
    const useSizes = sizeList.length ? sizeList : existingSizes;
    const sizes: (string | null)[] = useSizes.length ? useSizes : [null];
    const qty = Math.max(0, Number(optQty) || 0);
    const have = new Set(variants.map((v) => `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`));
    setOptSaving(true);
    let added = 0;
    try {
      for (let i = 0; i < chosen.length; i++) {
        const im = chosen[i];
        const label = (optSel[im.id] || "").trim() || `Design ${i + 1}`;
        for (const sz of sizes) {
          if (have.has(`${(sz ?? "").toLowerCase()}|${label.toLowerCase()}`)) {
            await supabase.from("product_variants").update({ image_url: im.url }).eq("product_id", id).eq("color", label);
            continue;
          }
          const { data: v, error } = await supabase
            .from("product_variants")
            .insert({ product_id: id, size: sz, color: label, image_url: im.url })
            .select()
            .single();
          if (error) throw error;
          const { error: e2 } = await supabase.from("inventory").insert({ product_id: id, variant_id: v.id, quantity: qty, reserved: 0 });
          if (e2) throw e2;
          added++;
        }
      }
      setOptSel({});
      await reloadVariants();
      showToast(lang === "en" ? `${added} option(s) created` : `${added}টি অপশন তৈরি হয়েছে`, "success");
    } catch (err: any) {
      await reloadVariants();
      showToast(err.message || t("error"), "error");
    } finally {
      setOptSaving(false);
    }
  }

  async function deleteVariantRow(idx: number) {
    const row = variants[idx];
    if (row.id) {
      if (!confirm(lang === "en" ? "Delete this variant?" : "এই ভ্যারিয়েন্টটি মুছে ফেলতে চান?")) return;
      await supabase.from("inventory").delete().eq("product_id", id);
      await supabase.from("product_variants").delete().eq("id", row.id);
    }
    setVariants((v) => v.filter((_, i) => i !== idx));
  }

  if (loading || !product) return <div className="text-sm text-mute">{t("loading")}</div>;

  const colorList: string[] = Array.from(new Set<string>(variants.map((v) => v.color.trim()).filter(Boolean)));
  const photos = product.product_images ?? [];

  const topCats = categories.filter((c) => !(c as any).parent_id);
  const childCats = (parentId: string) => categories.filter((c) => (c as any).parent_id === parentId);

  return (
    <div className="max-w-xl">
      <h1 className="font-extrabold text-lg mb-4">{t("edit")}</h1>

      <div className="bg-teal-tint border border-teal/20 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-dark mb-1.5">
          <LinkIcon size={13} />
          {lang === "en" ? "Product Link (paste this in Banners)" : "প্রোডাক্ট লিংক (ব্যানারে এটা বসান)"}
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate text-xs bg-white rounded-lg px-2.5 py-2 border border-border">{productPath}</code>
          <button onClick={copyProductLink} className="press bg-teal text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 shrink-0">
            <Copy size={13} /> {lang === "en" ? "Copy" : "কপি"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {product.product_images?.map((img) => (
          <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
            <img src={img.thumbnail_url ?? img.url} className="w-full h-full object-cover" />
            <button onClick={() => removeExistingImage(img.id)} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
              <X size={12} className="text-white" />
            </button>
          </div>
        ))}
        {newImages.map((img, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
            <img src={img.preview} className="w-full h-full object-cover" />
            <button onClick={() => setNewImages((prev) => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
              <X size={12} className="text-white" />
            </button>
          </div>
        ))}
        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-teal/40 bg-teal-tint flex items-center justify-center cursor-pointer text-teal-dark">
          <Upload size={16} />
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        </label>
      </div>

      <Field label={`${t("productName")} (EN)`}>
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} onBlur={() => pairName("en")} className="input" />
      </Field>
      <Field label={`${t("productName")} (বাংলা)`}>
        <input value={nameBn} onChange={(e) => setNameBn(e.target.value)} onBlur={() => pairName("bn")} className="input" />
      </Field>
      <Field label={t("description")}>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="input resize-none" />
      </Field>
      <Field label={t("category")}>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
          <option value="">—</option>
          {topCats.map((c) => (
            <React.Fragment key={c.id}>
              <option value={c.id}>{lang === "bn" ? c.name_bn : c.name_en}</option>
              {childCats(c.id).map((child) => (
                <option key={child.id} value={child.id}>
                  {"— "}
                  {lang === "bn" ? child.name_bn : child.name_en}
                </option>
              ))}
            </React.Fragment>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("oldPrice")}>
          <input type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} className="input" />
        </Field>
        <Field label={t("currentPrice")}>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
        </Field>
      </div>

      <label className="flex items-center gap-2 mb-6">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <span className="text-sm font-semibold">{t("activeProducts")}</span>
      </label>

      <button onClick={save} disabled={saving} className="press w-full bg-teal text-white font-bold text-sm py-3.5 rounded-xl disabled:opacity-60 mb-8">
        {saving ? t("loading") : t("save")}
      </button>

      {photos.length > 0 && (
        <div className="border-t border-border pt-5 mb-6">
          <div className="text-sm font-extrabold mb-1">{lang === "en" ? "Make color / design options from photos" : "ছবি থেকে রঙ / ডিজাইন অপশন বানান"}</div>
          <div className="text-xs text-mute mb-3">
            {lang === "en"
              ? "Tap each photo that is a separate color/design, type its name (e.g. Red, Design 2). Each becomes an option with its own photo and stock; customers pick it with the photo and the order shows it."
              : "যে ছবিগুলো আলাদা রঙ/ডিজাইন সেগুলোতে চাপ দিন, নিচে নাম লিখুন (যেমন লাল, ডিজাইন ২)। প্রতিটা ছবি আলাদা অপশন হবে — কাস্টমার ছবি দেখে বাছবে, অর্ডারেও ওই ছবি ও নাম আসবে।"}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {photos.map((img, i) => {
              const on = optSel[img.id] !== undefined;
              return (
                <div key={img.id} className={`rounded-xl border-2 p-1 ${on ? "border-orange bg-orange-tint" : "border-border bg-white"}`}>
                  <button type="button" onClick={() => setOptSel((m) => { const n = { ...m }; if (on) delete n[img.id]; else n[img.id] = ""; return n; })} className="press block w-full aspect-square rounded-lg overflow-hidden">
                    <img src={img.thumbnail_url ?? img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                  {on && (
                    <input value={optSel[img.id]} onChange={(e) => setOptSel((m) => ({ ...m, [img.id]: e.target.value }))} placeholder={`${lang === "en" ? "Name" : "নাম"} ${i + 1}`} className="input mt-1 !py-1.5 !text-xs" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={optSizes} onChange={(e) => setOptSizes(e.target.value)} placeholder={lang === "en" ? "Sizes (optional): M, L" : "সাইজ (ঐচ্ছিক): M, L"} className="input" />
            <input type="number" value={optQty} onChange={(e) => setOptQty(e.target.value)} placeholder={lang === "en" ? "Stock each" : "প্রতিটার স্টক"} className="input" />
          </div>
          <button onClick={createOptionsFromPhotos} disabled={optSaving} className="press w-full bg-orange text-white font-bold text-sm py-3 rounded-xl disabled:opacity-60">
            {optSaving ? t("loading") : lang === "en" ? "Create options" : "অপশন তৈরি করুন"}
          </button>
        </div>
      )}

      {colorList.length > 0 && photos.length > 0 && (
        <div className="border-t border-border pt-5 mb-6">
          <div className="text-sm font-extrabold mb-1">{lang === "en" ? "Color photos" : "কালারের ছবি"}</div>
          <div className="text-xs text-mute mb-3">
            {lang === "en"
              ? "Tap the photo that matches each color. Customers will see this photo for that color."
              : "প্রতিটি কালারের নিচে থেকে ওই রঙের ছবিটায় চাপ দিন। কাস্টমার ওই কালার চাপলে এই ছবি দেখবে, কার্টেও এই ছবি যাবে। সাথে সাথে সেভ হয়ে যায়।"}
          </div>
          <div className="space-y-3">
            {colorList.map((c) => {
              const cur = variants.find((v) => v.color.trim() === c)?.imageUrl ?? "";
              return (
                <div key={c} className="bg-white border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">{c}</span>
                    {cur ? (
                      <button onClick={() => clearColorImage(c)} className="press text-[11px] text-red-500 font-semibold">
                        {lang === "en" ? "Remove" : "সরান"}
                      </button>
                    ) : (
                      <span className="text-[11px] text-orange font-semibold">{lang === "en" ? "No photo" : "ছবি বসেনি"}</span>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {photos.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => pickColorImage(c, img.url)}
                        className={`press w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 ${cur === img.url ? "border-orange" : "border-border"}`}
                      >
                        <img src={img.thumbnail_url ?? img.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-border pt-5">
        <div className="text-sm font-extrabold mb-1">
          {lang === "en" ? "Size / Color / Stock" : "সাইজ / কালার / স্টক"}
        </div>
        <div className="text-xs text-mute mb-3">
          {lang === "en" ? "Add sizes and colors, set stock for each." : "সাইজ ও কালার যোগ করুন, প্রতিটার স্টক বসান।"}
        </div>

        <div className="bg-teal-tint border border-teal/20 rounded-xl p-3 mb-3">
          <div className="text-xs font-bold text-teal-dark mb-1.5">
            {lang === "en" ? "Quick add (sizes × colors)" : "একসাথে যোগ করুন (সাইজ × কালার)"}
          </div>
          <div className="text-[11px] text-mute mb-2">
            {lang === "en"
              ? "Comma separated. Leave color empty if the product has no color — the product photos are used then. Existing ones are skipped."
              : "কমা দিয়ে লিখুন। কালার না থাকলে ফাঁকা রাখুন, তখন পণ্যের ছবিই দেখাবে। যেগুলো আগে থেকে আছে সেগুলো বাদ যাবে, কিছু মুছবে না।"}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={bulkSizes} onChange={(e) => setBulkSizes(e.target.value)} placeholder={lang === "en" ? "Sizes: M, L, XL" : "সাইজ: M, L, XL"} className="input" />
            <input value={bulkColors} onChange={(e) => setBulkColors(e.target.value)} placeholder={lang === "en" ? "Colors (optional)" : "কালার (ঐচ্ছিক)"} className="input" />
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} placeholder={lang === "en" ? "Stock each" : "প্রতিটার স্টক"} className="input w-28" />
            <button onClick={addBulk} disabled={bulkSaving} className="press flex-1 bg-teal text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-60">
              {bulkSaving ? t("loading") : lang === "en" ? "Add all" : "সব যোগ করুন"}
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {variants.map((row, idx) => (
            <div key={idx} className="bg-white border border-border rounded-xl p-3">
              <div className="flex items-center gap-2">
              <input
                value={row.size}
                onChange={(e) => updateVariantRow(idx, { size: e.target.value })}
                placeholder={lang === "en" ? "Size" : "সাইজ"}
                className="input flex-1 min-w-0"
              />
              <input
                value={row.color}
                onChange={(e) => updateVariantRow(idx, { color: e.target.value })}
                placeholder={lang === "en" ? "Color" : "কালার"}
                className="input flex-1 min-w-0"
              />
              <input
                type="number"
                value={row.quantity}
                onChange={(e) => updateVariantRow(idx, { quantity: Math.max(0, Number(e.target.value)) })}
                placeholder={lang === "en" ? "Stock" : "স্টক"}
                className="input w-20"
              />
              <button
                onClick={() => saveVariantRow(idx)}
                disabled={variantSaving}
                className="press bg-teal text-white text-xs font-bold px-3 py-2 rounded-lg shrink-0 disabled:opacity-60"
              >
                {t("save")}
              </button>
              <button onClick={() => deleteVariantRow(idx)} className="press text-red-600 shrink-0">
                <Trash2 size={16} />
              </button>
              </div>
              {row.quantity <= 0 && (
                <div className="text-[11px] font-bold text-red-500 mt-1.5">
                  {lang === "en" ? "Out of stock — customers will see “stock finished” for this one" : "স্টক শেষ — কাস্টমার এটা বেছে নিলে “স্টক শেষ” দেখবে"}
                </div>
              )}
              {row.color.trim() !== "" && variants.findIndex((v) => v.color.trim() === row.color.trim()) === idx && (
              <div className="flex items-center gap-2 mt-2">
                {row.imageUrl ? (
                  <img src={row.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-teal-tint shrink-0" />
                )}
                <input
                  value={row.imageUrl}
                  onChange={(e) => updateVariantRow(idx, { imageUrl: e.target.value })}
                  placeholder={lang === "en" ? "Photo for this color (all sizes)" : "এই কালারের ছবি (সব সাইজে বসবে)"}
                  className="input flex-1 min-w-0 text-xs"
                />
                <label className="press bg-teal-tint text-teal-dark rounded-lg p-2.5 cursor-pointer shrink-0">
                  <Upload size={15} />
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => uploadVariantImage(idx, e.target.files?.[0])} />
                </label>
              </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addVariantRow}
          className="press flex items-center justify-center gap-2 w-full bg-teal-tint text-teal-dark text-sm font-bold py-2.5 rounded-xl"
        >
          <Plus size={15} /> {lang === "en" ? "Add Size/Color" : "নতুন সাইজ/কালার যোগ করুন"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-bold text-mute mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
