import sharp from 'sharp';
import { put, del } from '@vercel/blob';

export async function normalizeImage(input) {
  const image = sharp(input, { limitInputPixels: 25000000, failOn: 'error' });
  const metadata = await image.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error('Unsupported photograph');
  // Re-encoding also removes EXIF (including location) and other original metadata.
  const { data, info } = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export function blobImages(env = process.env) {
  const storeId = env.BLOB_STORE_ID?.trim(), token = env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!storeId && !token) return undefined;
  // Deployed OIDC tokens can live in the request context, not process.env.
  // The SDK resolves and refreshes that token for each operation; never cache it.
  const auth = storeId ? { storeId } : { token };
  return {
    put: (id, bytes) => put(`story/${id}.webp`, bytes, { access: 'public', contentType: 'image/webp', addRandomSuffix: false, cacheControlMaxAge: 86400, ...auth }),
    remove: url => del(url, auth)
  };
}
