import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { uploadService } from "../../services/uploadService";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import type { Category } from "../../types";

/**
 * "Smart" generation is intentionally simple, deterministic, on-device
 * logic (no external AI call) so it works with zero extra configuration.
 * Swap `autoTranslate` for a real translation API call if you want
 * higher-quality Bangla<->English output — the admin always reviews and
 * can edit the result before publishing either way (see spec section 15).
 */
function isBangla(text: string) {
  return /[\u0980-\u09FF]/.test(text);
}
function autoTranslateLabel(text: string, targetIsBangla: boolean) {
  if (!text) return "";
  return targetIsBangla ? `${text} (বাংলা অনুবাদ প্রয়োজন)` : `${text} (EN translation needed)`;
}
function slugifyKeywords(nameEn: string, nameBn: string, brand: string, tags: string) {
  return [nameEn, nameBn, brand, tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^\w\s\u0980-\u09FF]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 20)
    .join(", ");
}

export default function AddProduct() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [sku, setSku] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  // Auto-generate the bilingual name pair + SEO fields whenever the admin
  // types the primary name — admin can still edit every field afterward.
  useEffect(() => {
    if (!nameInput) return;
    if (isBangla(nameInput)) {
      setNameBn(nameInput);
      setNameEn((prev) => (prev.endsWith("(EN translation needed)") || !prev ? autoTranslateLabel(nameInput, false) : prev));
    } else {
      setNameEn(nameInput);
      setNameBn((prev) => (prev.endsWith("(বাংলা অনুবাদ প্রয়োজন)") || !prev ? autoTranslateLabel(nameInput, true) : prev));
    }
  }, [nameInput]);

  const discount = oldPrice && price && Number(oldPrice) > Number(price)
    ? Math.round(((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100)
    : 0;

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next: { file: File; preview: string }[] = [];
    Array.from(fileList).forEach((file) => {
      const err = uploadService.validate(file);
      if (err) {
        showToast(err, "error");
        return;
      }
      next.push({ file, preview: URL.createObjectURL(file) });
    });
    setImages((prev) => [...prev, ...next]);
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function publish() {
    if (!nameEn.trim() && !nameBn.trim()) return showToast(t("productName"), "error");
    if (!price || !oldPrice) return showToast(t("currentPrice"), "error");
    if (images.length === 0) return showToast(t("uploadImage"), "error");

    setUploading(true);
    try {
      const generatedSku = sku.trim() || `JH-${Date.now().toString().slice(-8)}`;
      const keywords = slugifyKeywords(nameEn, nameBn, brand, tags);

      const { data: product, error } = await supabase
        .from("products")
        .insert({
          sku: generatedSku,
          category_id: categoryId || null,
          name_en: nameEn.trim() || autoTranslateLabel(nameBn, false),
          name_bn: nameBn.trim() || autoTranslateLabel(nameEn, true),
          description_en: desc,
          description_bn: desc,
          short_description_en: desc.slice(0, 120),
          short_description_bn: desc.slice(0, 120),
          brand: brand || null,
          old_price: Number(oldPrice),
          current_price: Number(price),
          tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
          search_keywords: keywords,
          seo_title: nameEn || nameBn,
          seo_description: desc.slice(0, 155),
          is_active: true
        })
        .select()
        .single();
      if (error) throw error;

      // Upload + attach images
      for (let i = 0; i < images.length; i++) {
        const { url, thumbnailUrl } = await uploadService.uploadProductImage(images[i].file, product.id);
        await supabase.from("product_images").insert({
          product_id: product.id,
          url,
          thumbnail_url: thumbnailUrl,
          is_main: i === 0,
          sort_order: i
        });
      }

      // Create variants (size x color) + inventory
      const sizeList = sizes.split(",").map((s) => s.trim()).filter(Boolean);
      const colorList = colors.split(",").map((s) => s.trim()).filter(Boolean);
      const combos: { size: string | null; color: string | null }[] =
        sizeList.length === 0 && colorList.length === 0
          ? [{ size: null, color: null }]
          : sizeList.length === 0
          ? colorList.map((c) => ({ size: null, color: c }))
          : colorList.length === 0
          ? sizeList.map((s) => ({ size: s, color: null }))
          : sizeList.flatMap((s) => colorList.map((c) => ({ size: s, color: c })));

      const qtyEach = Number(stockQty) || 10;
      for (const combo of combos) {
        const { data: variant } = await supabase
          .from("product_variants")
          .insert({ product_id: product.id, size: combo.size, color: combo.color })
          .select()
          .single();
        await supabase.from("inventory").insert({
          product_id: product.id,
          variant_id: variant?.id ?? null,
          quantity: qtyEach
        });
      }

      showToast(t("published"));
      navigate("/admin/products");
    } catch (err: any) {
      showToast(err.message || t("error"), "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-extrabold text-lg mb-4">{t("addProduct")}</h1>

      <div className="flex gap-2 flex-wrap mb-4">
        {images.map((img, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
            <img src={img.preview} className="w-full h-full object-cover" />
            <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
              <X size={12} className="text-white" />
            </button>
          </div>
        ))}
        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-teal/40 bg-teal-tint flex flex-col items-center justify-center gap-1 cursor-pointer text-teal-dark">
          <Upload size={16} />
          <span className="text-[9px] font-semibold text-center px-1">{t("uploadImage")}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        </label>
      </div>

      <Field label={t("productName")}>
        <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder={t("productNamePh")} className="input" />
      </Field>

      {nameInput && (
        <div className="grid grid-cols-2 gap-3 -mt-1 mb-4">
          <Field label={`${t("productName")} (EN)`}>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="input" />
          </Field>
          <Field label={`${t("productName")} (বাংলা)`}>
            <input value={nameBn} onChange={(e) => setNameBn(e.target.value)} className="input" />
          </Field>
        </div>
      )}
      {nameInput && (
        <div className="text-[11px] text-mute flex items-center gap-1 -mt-3 mb-4">
          <Sparkles size={11} /> {t("autoTranslate")}
        </div>
      )}

      <Field label={t("description")}>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="input resize-none" />
      </Field>

      <Field label={t("category")}>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {lang === "bn" ? c.name_bn : c.name_en}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("sizesAvail")}>
          <input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder={t("sizesPh")} className="input" />
        </Field>
        <Field label={`${t("color")} (comma separated)`}>
          <input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Red, Blue" className="input" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("oldPrice")}>
          <input type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} className="input" />
        </Field>
        <Field label={t("currentPrice")}>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
        </Field>
      </div>
      {discount > 0 && (
        <div className="text-xs font-bold text-orange -mt-2 mb-4">
          {t("discount")}: {discount}% {t("off")}
        </div>
      )}

      <Field label={t("stockQty")}>
        <input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="10" className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU / Product code (optional)">
          <input value={sku} onChange={(e) => setSku(e.target.value)} className="input" />
        </Field>
        <Field label="Brand (optional)">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className="input" />
        </Field>
      </div>
      <Field label="Tags (comma separated, optional)">
        <input value={tags} onChange={(e) => setTags(e.target.value)} className="input" />
      </Field>

      <button
        onClick={publish}
        disabled={uploading}
        className="press w-full bg-orange text-white font-bold text-sm py-3.5 rounded-xl mt-2 disabled:opacity-60"
      >
        {uploading ? t("loading") : t("publish")}
      </button>
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
