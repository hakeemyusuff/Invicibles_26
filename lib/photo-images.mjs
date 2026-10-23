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
  if (!env.BLOB_READ_WRITE_TOKEN && !(env.BLOB_STORE_ID && env.VERCEL_OIDC_TOKEN)) return undefined;
  // Let the SDK obtain the current short-lived OIDC token for each request.
  const auth = env.BLOB_STORE_ID && env.VERCEL_OIDC_TOKEN ? { storeId: env.BLOB_STORE_ID } : { token: env.BLOB_READ_WRITE_TOKEN };
  return {
    put: (id, bytes) => put(`story/${id}.webp`, bytes, { access: 'public', contentType: 'image/webp', addRandomSuffix: false, cacheControlMaxAge: 86400, ...auth }),
    remove: url => del(url, auth)
  };
}
