import { createPhotoHandler } from '../lib/photo-service.mjs';
import { blobImages, normalizeImage } from '../lib/photo-images.mjs';

export default {
  fetch(request) {
    return createPhotoHandler({ images: blobImages(), normalizeImage })(request);
  }
};
