import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Upload } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { uploadService } from "../../services/uploadService";
import { useLanguage } from "../../i18n/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import type { Category, Product } from "../../types";

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

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("products").select("*, product_images(*)").eq("id", id).single(),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order")
    ]).then(([{ data: p }, { data: cats }]) => {
      if (p) {
        setProduct(p as unknown as Product);
        setNameEn(p.name_en);
        setNameBn(p.name_bn);
        setDesc(p.description_en ?? "");
        setCategoryId(p.category_id ?? "");
        setOldPrice(String(p.old_price));
        setPrice(String(p.current_price));
        setIsActive(p.is_active);
      }
      setCategories((cats as Category[]) ?? []);
      setLoading(false);
    });
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

  if (loading || !product) return <div className="text-sm text-mute">{t("loading")}</div>;

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
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {lang === "bn" ? c.name_bn : c.name_en}
            </option>
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

      <button onClick={save} disabled={saving} className="press w-full bg-teal text-white font-bold text-sm py-3.5 rounded-xl disabled:opacity-60">
        {saving ? t("loading") : t("save")}
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
