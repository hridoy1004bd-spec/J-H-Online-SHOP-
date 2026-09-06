import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Upload, Plus, Trash2 } from "lucide-react";
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
    setVariants((v) => [...v, { id: null, size: "", color: "", quantity: 0, inventoryId: null, isNew: true }]);
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
          .insert({ product_id: id, size: row.size || null, color: row.color || null })
          .select()
          .single();
        if (error) throw error;
        variantId = data.id;
      } else {
        const { error } = await supabase
          .from("product_variants")
          .update({ size: row.size || null, color: row.color || null })
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

      updateVariantRow(idx, { id: variantId, isNew: false });
      showToast(lang === "en" ? "Variant saved" : "ভ্যারিয়েন্ট সেভ হয়েছে", "success");
    } catch (err: any) {
      showToast(err.message || t("error"), "error");
    } finally {
      setVariantSaving(false);
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

  const topCats = categories.filter((c) => !(c as any).parent_id);
  const childCats = (parentId: string) => categories.filter((c) => (c as any).parent_id === parentId);

  return (
    <div className="max-w-xl">
      <h1 className="font-extrabold text-lg mb-4">{t("edit")}</h1>

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
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="input" />
      </Field>
      <Field label={`${t("productName")} (বাংলা)`}>
        <input value={nameBn} onChange={(e) => setNameBn(e.target.value)} className="input" />
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

      <div className="border-t border-border pt-5">
        <div className="text-sm font-extrabold mb-1">
          {lang === "en" ? "Size / Color / Stock" : "সাইজ / কালার / স্টক"}
        </div>
        <div className="text-xs text-mute mb-3">
          {lang === "en" ? "Add sizes and colors, set stock for each." : "সাইজ ও কালার যোগ করুন, প্রতিটার স্টক বসান।"}
        </div>

        <div className="space-y-2 mb-3">
          {variants.map((row, idx) => (
            <div key={idx} className="bg-white border border-border rounded-xl p-3 flex items-center gap-2">
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
