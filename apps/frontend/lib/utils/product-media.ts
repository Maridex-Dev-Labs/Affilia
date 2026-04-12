export const PRODUCT_MEDIA_GUIDELINES = [
  'Upload at least 1 clear product asset and at most 6 files.',
  'Accepted images: JPG, PNG, WEBP up to 5MB each.',
  'Accepted videos: MP4, MOV, WEBM up to 20MB each.',
  'Do not include contact numbers, watermarks, or unrelated graphics.',
  'The first asset should clearly show the product for review and marketplace display.',
];

export function validateProductFiles(files: File[]) {
  if (files.length === 0) return 'Add at least one product image or video.';
  if (files.length > 6) return 'You can upload up to 6 media files per product.';

  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return `${file.name} is not a supported image or video file.`;
    if (isImage && file.size > 5 * 1024 * 1024) return `${file.name} exceeds the 5MB image limit.`;
    if (isVideo && file.size > 20 * 1024 * 1024) return `${file.name} exceeds the 20MB video limit.`;
  }

  return null;
}

export function toMediaPayload(items: { url: string; type: string; name: string; size: number }[]) {
  return items.map((item) => ({
    url: item.url,
    type: item.type.startsWith('video/') ? 'video' : 'image',
    name: item.name,
    size: item.size,
  }));
}

export function getPrimaryMediaUrl(product: any) {
  const media = Array.isArray(product?.media) ? product.media : [];
  const firstMediaUrl = media[0]?.url;
  if (firstMediaUrl) return firstMediaUrl;
  return Array.isArray(product?.images) ? product.images[0] : null;
}
