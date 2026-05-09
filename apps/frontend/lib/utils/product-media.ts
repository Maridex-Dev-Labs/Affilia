const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'tif', 'tiff', 'heic', 'heif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv', '3gp', 'mpeg', 'mpg', 'm2ts', 'mts'];
const IMAGE_LIMIT_BYTES = 15 * 1024 * 1024;
const VIDEO_LIMIT_BYTES = 50 * 1024 * 1024;
const MAX_DIMENSION = 1800;
const JPEG_QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

export const PRODUCT_MEDIA_GUIDELINES = [
  'Upload at least 1 clear product asset and at most 6 files.',
  'Accepted images include JPG, PNG, WEBP, GIF, AVIF, BMP, TIFF, SVG, and iPhone HEIC/HEIF up to 15MB each after optimisation.',
  'Accepted videos include MP4, MOV, WEBM, M4V, AVI, MKV, 3GP, MPEG, and transport-stream formats up to 50MB each.',
  'Do not include contact numbers, watermarks, or unrelated graphics.',
  'The first asset should clearly show the product for review and marketplace display.',
];

function extensionOf(name: string) {
  return name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
}

export function inferProductMediaMime(name: string, currentType = '') {
  if (currentType) return currentType;
  return mimeFromExtension(extensionOf(name));
}

function isImageLike(file: File) {
  const type = inferProductMediaMime(file.name, file.type);
  return type.startsWith('image/') || IMAGE_EXTENSIONS.includes(extensionOf(file.name));
}

function isVideoLike(file: File) {
  const type = inferProductMediaMime(file.name, file.type);
  return type.startsWith('video/') || VIDEO_EXTENSIONS.includes(extensionOf(file.name));
}

function mimeFromExtension(ext: string) {
  return {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    heic: 'image/heic',
    heif: 'image/heif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    m4v: 'video/x-m4v',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    '3gp': 'video/3gpp',
    mpeg: 'video/mpeg',
    mpg: 'video/mpeg',
    m2ts: 'video/mp2t',
    mts: 'video/mp2t',
  }[ext] || '';
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`We could not process ${file.name}. If this is an iPhone photo, switch the camera format to Most Compatible or choose a JPG/PNG copy.`));
    };
    img.src = url;
  });
}

async function canvasToFile(canvas: HTMLCanvasElement, name: string, quality: number) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error(`We could not optimise ${name} for upload.`);
  const baseName = name.replace(/\.[^.]+$/, '') || 'product-image';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

export async function normaliseProductFiles(files: File[]) {
  const prepared: File[] = [];

  for (const file of files) {
    if (!isImageLike(file)) {
      const safeType = inferProductMediaMime(file.name, file.type);
      prepared.push(file.type ? file : new File([file], file.name, { type: safeType || file.type }));
      continue;
    }

    const ext = extensionOf(file.name);
    const originalType = inferProductMediaMime(file.name, file.type) || 'image/jpeg';
    const needsNormalisation =
      file.size > IMAGE_LIMIT_BYTES ||
      ['heic', 'heif'].includes(ext) ||
      originalType === 'image/heic' ||
      originalType === 'image/heif';

    if (!needsNormalisation) {
      prepared.push(file.type ? file : new File([file], file.name, { type: originalType }));
      continue;
    }

    const image = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width || 1, image.height || 1));
    const width = Math.max(1, Math.round((image.width || 1) * scale));
    const height = Math.max(1, Math.round((image.height || 1) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error(`We could not prepare ${file.name} for upload.`);
    context.drawImage(image, 0, 0, width, height);

    let output: File | null = null;
    for (const quality of JPEG_QUALITY_STEPS) {
      const candidate = await canvasToFile(canvas, file.name, quality);
      output = candidate;
      if (candidate.size <= IMAGE_LIMIT_BYTES) break;
    }

    if (!output || output.size > IMAGE_LIMIT_BYTES) {
      throw new Error(`${file.name} is still too large after optimisation. Choose a slightly smaller image and try again.`);
    }

    prepared.push(output);
  }

  return prepared;
}

export function validateProductFiles(files: File[]) {
  if (files.length === 0) return 'Add at least one product image or video.';
  if (files.length > 6) return 'You can upload up to 6 media files per product.';

  for (const file of files) {
    const isImage = isImageLike(file);
    const isVideo = isVideoLike(file);
    if (!isImage && !isVideo) return `${file.name} is not a supported image or video file.`;
    if (isImage && file.size > IMAGE_LIMIT_BYTES) return `${file.name} exceeds the 15MB image limit. Try again and the image will be optimised automatically when possible.`;
    if (isVideo && file.size > VIDEO_LIMIT_BYTES) return `${file.name} exceeds the 50MB video limit.`;
  }

  return null;
}

export function toMediaPayload(items: { url: string; type: string; name: string; size: number }[]) {
  return items.map((item) => ({
    url: item.url,
    type: inferProductMediaMime(item.name, item.type).startsWith('video/') ? 'video' : 'image',
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
