import { supabase } from "../lib/supabase";

const BUCKET = "product-images";
const MAX_DIMENSION = 1600;
const THUMB_DIMENSION = 320;
const JPEG_QUALITY = 0.82;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 8;

function resizeToBlob(file: File, maxDim: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))), "image/jpeg", quality);
    };
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = url;
  });
}

/**
 * ব্যানার/ক্যাটাগরি/লোগোর মতো সরাসরি আপলোডের আগে ছবি ছোট করে (ডাউনলোড খরচ কমাতে)।
 * ছবির পাশ maxDim-এর বেশি হবে না। স্বচ্ছ (PNG) ছবি হলে স্বচ্ছতা রেখে WebP/PNG, নইলে JPEG।
 * ছোট করে আরও বড় হলে আসল ফাইলই ফেরত দেয়।
 */
export async function compressForUpload(file: File | Blob, maxDim = 1280, quality = 0.8): Promise<{ blob: Blob; ext: string; type: string }> {
  const srcType = file.type || "image/jpeg";
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    const url = URL.createObjectURL(file);
    i.onload = () => {
      URL.revokeObjectURL(url);
      resolve(i);
    };
    i.onerror = () => reject(new Error("Could not read image"));
    i.src = url;
  });
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);
  // স্বচ্ছতা আছে কি না দেখি (শুধু স্বচ্ছ PNG হলে PNG/WebP রাখি; নইলে JPEG, কারণ iPhone Safari WebP বানাতে পারে না আর PNG অনেক বড়)
  let hasAlpha = false;
  if (srcType === "image/png" || srcType === "image/webp") {
    try {
      const d = ctx.getImageData(0, 0, w, h).data;
      for (let i = 3; i < d.length; i += 16) {
        if (d[i] < 250) {
          hasAlpha = true;
          break;
        }
      }
    } catch {
      hasAlpha = false;
    }
  }
  const toBlob = (type: string, q?: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let out: Blob | null = null;
  if (hasAlpha) {
    const webp = await toBlob("image/webp", quality);
    out = webp && webp.type === "image/webp" ? webp : await toBlob("image/png");
  } else {
    const c2 = document.createElement("canvas");
    c2.width = w;
    c2.height = h;
    const x2 = c2.getContext("2d")!;
    x2.fillStyle = "#fff";
    x2.fillRect(0, 0, w, h);
    x2.drawImage(img, 0, 0, w, h);
    out = await new Promise<Blob | null>((r) => c2.toBlob(r, "image/jpeg", quality));
  }
  if (!out || out.size >= file.size) {
    const ext = srcType === "image/png" ? "png" : srcType === "image/webp" ? "webp" : "jpg";
    return { blob: file, ext, type: srcType };
  }
  const ext = out.type === "image/webp" ? "webp" : out.type === "image/png" ? "png" : "jpg";
  return { blob: out, ext, type: out.type };
}

export const uploadService = {
  validate(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) return "Only JPG, PNG and WEBP images are allowed";
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `Image must be under ${MAX_FILE_SIZE_MB}MB`;
    return null;
  },

  /** Compresses, uploads a main image + thumbnail to Supabase Storage, returns public URLs. */
  async uploadProductImage(file: File, productId: string) {
    const err = this.validate(file);
    if (err) throw new Error(err);

    const full = await resizeToBlob(file, MAX_DIMENSION, JPEG_QUALITY);
    const thumb = await resizeToBlob(file, THUMB_DIMENSION, JPEG_QUALITY);

    const stamp = Date.now();
    const fullPath = `${productId}/${stamp}.jpg`;
    const thumbPath = `${productId}/${stamp}_thumb.jpg`;

    const { error: e1 } = await supabase.storage.from(BUCKET).upload(fullPath, full, {
      contentType: "image/jpeg",
      cacheControl: "31536000"
    });
    if (e1) throw e1;

    const { error: e2 } = await supabase.storage.from(BUCKET).upload(thumbPath, thumb, {
      contentType: "image/jpeg",
      cacheControl: "31536000"
    });
    if (e2) throw e2;

    const url = supabase.storage.from(BUCKET).getPublicUrl(fullPath).data.publicUrl;
    const thumbnailUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;
    return { url, thumbnailUrl };
  },

  async deleteProductImage(path: string) {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  }
};

/*
Create the storage bucket once, either in the Supabase dashboard
(Storage -> New bucket -> "product-images", Public) or via SQL:

  insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

  create policy "public read product images" on storage.objects
    for select using (bucket_id = 'product-images');

  create policy "admin upload product images" on storage.objects
    for insert with check (bucket_id = 'product-images' and is_admin());

  create policy "admin delete product images" on storage.objects
    for delete using (bucket_id = 'product-images' and is_admin());
*/
