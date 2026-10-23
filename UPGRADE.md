# Update the existing Vercel deployment

The code adds portrait photo windows, password-protected contributions to the photo album, and shareable countdown snapshots. Existing memory-wall data stays in the same Redis hash.

## Before merging/deploying

1. Open the `aee-invicibles-26` project in Vercel. Under **Storage**, create/connect a **public Vercel Blob** store. Connect the production environment. Keep the generated Blob environment configuration; the server supports `BLOB_STORE_ID` with Vercel OIDC or `BLOB_READ_WRITE_TOKEN`.
2. Under **Settings → Environment Variables**, add `GALLERY_UPLOAD_PASSWORD` as a secret using the class password you chose. Keep the actual password out of GitHub and frontend code. The private `MEMORY_ADMIN_TOKEN` remains a separate organiser credential.
3. Merge the update and let the connected Git deployment run. Adding environment variables after deploying requires a redeployment. For preview testing, use separate non-production stores and password values.

The portrait card and countdown sharing work without new storage configuration. Until both the Blob connection and the upload password exist, photo contributions stay closed; the existing album and memory wall remain available.

## Verify after deployment

- Visit `/api/photos`: it should return `available: true`.
- Add a photo with a wrong password: the site must reject it.
- Add one or more photos with the correct class password. Open another browser and refresh the album; the photos should appear with their captions and contributor credit.
- Visit `/admin.html` using your existing organiser token. Hide a photo, refresh the public album, then restore it. Hiding is reversible and does not delete the public Blob file.
- Try both card formats with a portrait photograph. The photo window is 3:4 in both; exported canvases remain 1080 × 1350 and 1080 × 1920.
- Open **Share the countdown**. Its preview ticks live; **Download image** saves a snapshot. **Copy live countdown link** links to the running timer. Shared PNGs cannot keep ticking on WhatsApp/Instagram.

## Local checks

Node.js 22.13+ (24 recommended):

```sh
npm ci
npm test
npm run build
```

To test uploads locally without cloud credentials, set a test `GALLERY_UPLOAD_PASSWORD` and `MEMORY_ADMIN_TOKEN` in `.env.local`, then run `npm run dev`. SQLite metadata and uploaded WebP files stay under `.data/`, which is ignored by Git.

## Files and limits

- Select up to 8 JPG/PNG/WebP photos per batch, up to 12 MB each before browser compression. Uploads run one at a time.
- The server accepts up to 3 MB per compressed picture, validates and re-encodes it as WebP, strips metadata, and caps the longest side at 1600 pixels. Images over 25 megapixels or animated images are rejected by server validation.
- Redis stores metadata only. Monitor Blob storage and transfer usage in Vercel; its allowance is separate from Redis.
- `/admin.html` can export a JSON archive of notes and photo metadata/URLs. Download the actual photo files separately if keeping an offline archive.
