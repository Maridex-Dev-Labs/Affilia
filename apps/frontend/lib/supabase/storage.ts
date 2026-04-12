import { supabase } from './client';

export const buckets = {
  merchantDocs: 'merchant-docs',
  productImages: 'product-images',
  avatars: 'avatars',
  receipts: 'receipts',
};

async function uploadToBucket(bucket: string, userId: string, file: File) {
  const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
  const path = `${userId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadMerchantDoc(userId: string, file: File) {
  return uploadToBucket(buckets.merchantDocs, userId, file);
}

export async function uploadProductImage(userId: string, file: File) {
  return uploadToBucket(buckets.productImages, userId, file);
}

export async function uploadProductMedia(userId: string, file: File) {
  return uploadToBucket(buckets.productImages, userId, file);
}

export async function uploadDepositScreenshot(userId: string, file: File) {
  return uploadToBucket(buckets.merchantDocs, userId, file);
}

export async function uploadProfileAvatar(userId: string, file: File) {
  return uploadToBucket(buckets.avatars, userId, file);
}
