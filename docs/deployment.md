# Deployment and operation

## Vercel configuration

Import the GitHub repository into Vercel with **Other** as the framework preset. `vercel.json` configures `npm run build`, the `public` output directory, security headers and the Node.js API functions.

Connect an Upstash Redis database and a **public** Vercel Blob store to the project. Include the Production environment for the live site. Use separate resources and credentials for development and preview testing.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Redis REST endpoint. `KV_REST_API_URL` is also accepted. |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST credential. `KV_REST_API_TOKEN` is also accepted. |
| `BLOB_STORE_ID` | Connected Blob store. Vercel manages OIDC authentication at request time. |
| `BLOB_READ_WRITE_TOKEN` | Alternative Blob credential for environments using a static read-write token. |
| `GALLERY_UPLOAD_PASSWORD` | Shared class password required for photo contributions. |
| `MEMORY_ADMIN_TOKEN` | Separate private credential for the organiser page. |
| `MEMORY_POST_CODE` | Optional posting code for written memories. |
| `MEMORY_REQUIRE_APPROVAL` | Set to `true` to moderate written memories before publication; requires an admin token. |

Add secrets in Vercel’s Environment Variables settings, scoped to the intended environment. Keep credentials out of the repository and browser code. A new deployment is required after environment changes.

Blob’s generated `BLOB_WEBHOOK_PUBLIC_KEY` verifies webhook callbacks; the server upload route does not use it. A connected store uses `BLOB_STORE_ID` and the SDK’s request-time OIDC lookup. Do not manually copy or cache `VERCEL_OIDC_TOKEN`: deployed Functions may receive it through request context rather than an environment variable.

## Verify a deployment

1. Open `/api/memories` and `/api/photos`. Each configured feature should report `available: true`.
2. Submit a memory and check it from another browser.
3. Upload a class photograph using the photo password. Refresh the album in another browser and check the image, caption and credit.
4. Confirm that an incorrect photo password is rejected.
5. In `/admin.html`, hide and restore the contributed photo, checking the public album after each change.
6. Download a personal card and a countdown snapshot. Check both card formats and open the shared live countdown link.

If photo contributions report `available: false`, check the Redis connection, Blob store configuration and `GALLERY_UPLOAD_PASSWORD` in the deployment’s environment. `BLOB_STORE_ID` alone configures the Blob adapter; the SDK authenticates each write using the current request’s token. The browser’s disabled button reflects API availability and should not be manually enabled to bypass this check.

## Content and moderation

The organiser page accepts `MEMORY_ADMIN_TOKEN`, held in browser memory only. It can publish or hide notes and contributed photos, and export notes plus photo metadata as JSON. Contributors can remove their own written notes from the browser where they posted them.

The 15 curated gallery entries are maintained in `public/gallery.json`. New photographs are stored separately. Class-name suggestions in `public/class-names.json` can be edited, and visitors can enter their own spellings or nicknames.

The shared album and its image URLs are public. Hiding a photo removes it from the album but does not revoke its direct URL; deleting the file from Blob removes the stored image. Card-maker portraits stay on the visitor’s device.

## Storage and limits

- Memories use the Redis hash `invincibles26:notes`; photo metadata uses `invincibles26:photos`.
- Image bytes are stored in Blob, with a maximum output dimension of 1600 pixels and WebP encoding that strips EXIF metadata.
- The browser accepts up to eight JPG, PNG or WebP files per batch, at most 12 MB each before compression. Compressed uploads are limited to 3 MB each.
- Server checks include image decoding, a 25-megapixel input limit, consent, origin validation, password checks and rate limits. Animated images are rejected.
- Stable upload IDs prevent duplicate records when a completed upload is retried.
- Blob storage/transfer and Redis have separate usage allowances. The organiser’s JSON export contains image URLs, not image bytes; download the files separately for an offline archive.

## References

- [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Vercel OIDC reference](https://vercel.com/docs/oidc/reference)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi)
