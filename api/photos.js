import { createPhotoHandler } from '../lib/photo-service.mjs';
import { blobImages, normalizeImage } from '../lib/photo-images.mjs';

export default { fetch: createPhotoHandler({ images: blobImages(), normalizeImage }) };
