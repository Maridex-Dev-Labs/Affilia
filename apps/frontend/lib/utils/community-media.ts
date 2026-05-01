export const COMMUNITY_MEDIA_GUIDELINES = [
  'You can attach up to 4 files to a forum post.',
  'Accepted images: JPG, PNG, WEBP up to 5MB each.',
  'Accepted videos: MP4, MOV, WEBM up to 20MB each.',
  'Do not upload unrelated promos, phone numbers, or low-quality reposts.',
];

export function validateCommunityFiles(files: File[]) {
  if (files.length > 4) return 'You can upload up to 4 media files per forum post.';

  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return `${file.name} is not a supported image or video file.`;
    if (isImage && file.size > 5 * 1024 * 1024) return `${file.name} exceeds the 5MB image limit.`;
    if (isVideo && file.size > 20 * 1024 * 1024) return `${file.name} exceeds the 20MB video limit.`;
  }

  return null;
}

export function toCommunityMediaPayload(items: { url: string; type: string; name: string; size: number }[]) {
  return items.map((item) => ({
    url: item.url,
    type: item.type.startsWith('video/') ? 'video' : 'image',
    name: item.name,
    size: item.size,
  }));
}
