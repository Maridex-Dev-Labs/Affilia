import { supabase } from './client';

export const buckets = {
  merchantDocs: 'merchant-docs',
  productImages: 'product-images',
  communityMedia: 'community-media',
  avatars: 'avatars',
  receipts: 'receipts',
  legalAgreements: 'legal-agreements',
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

async function uploadPrivateToBucket(bucket: string, userId: string, file: File) {
  const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
  const path = `${userId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function uploadMerchantDoc(userId: string, file: File) {
  return uploadPrivateToBucket(buckets.merchantDocs, userId, file);
}

export async function uploadProductImage(userId: string, file: File) {
  return uploadToBucket(buckets.productImages, userId, file);
}

export async function uploadProductMedia(userId: string, file: File) {
  return uploadToBucket(buckets.productImages, userId, file);
}

export async function uploadCommunityMedia(userId: string, file: File) {
  return uploadToBucket(buckets.communityMedia, userId, file);
}

export async function uploadDepositScreenshot(userId: string, file: File) {
  return uploadPrivateToBucket(buckets.merchantDocs, userId, file);
}

export async function uploadProfileAvatar(userId: string, file: File) {
  return uploadToBucket(buckets.avatars, userId, file);
}

export async function uploadSignedAgreement(userId: string, file: File) {
  return uploadPrivateToBucket(buckets.legalAgreements, userId, file);
}

export async function createSignedStorageUrl(bucket: string, path: string, expiresIn = 60) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
