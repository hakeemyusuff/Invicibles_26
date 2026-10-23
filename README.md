# The Invincibles ’26

A complete, Vercel-ready class sign-out website for Agricultural and Environmental Engineering, University of Ibadan.

## Included

- Nigerian-time countdown to 29 October 2026 at 11 a.m.; celebration state after the countdown ends; live share preview, 1080 × 1920 PNG snapshots and a link to the running countdown.
- 15 curated photographs plus a shared, password-protected photo album. Classmates can add up to 8 pictures per batch, with previews, compression, retry protection, captions and credit in the lightbox.
- Personal card maker with Editorial, Evergreen and Blueprint designs, editable class-name suggestions, a 3:4 portrait photo window in both export sizes, local portrait processing, drag-to-position, zoom, quotes, 1080 × 1350 portrait and 1080 × 1920 Status exports, and native sharing where supported.
- A genuinely shared memory-wall API, durable Redis storage, rate limits, optional class code, optional approval, own-note removal and a private organiser page.
- Plain HTML, CSS and browser JavaScript. Fonts and original gallery photographs are included locally. Server photo uploads use `@vercel/blob` and `sharp`; `package-lock.json` pins dependencies.

## Run locally

Use Node.js 22.13 or newer (24 recommended).

```sh
npm ci
cp .env.example .env.local
# Set a test GALLERY_UPLOAD_PASSWORD in .env.local to try photo contributions.
npm run dev
```

Open http://localhost:4173. Without Redis credentials, local preview stores notes and photo metadata in SQLite under `.data/`, and uploaded files under `.data/photos/`. These contributions are labelled as preview data and are never deployed. If Redis credentials are set, the dev server uses the connected Redis and Blob stores instead, so use separate development stores. The Vercel functions require durable Redis and Blob storage.

```sh
npm test
npm run build
```

## Updating an existing deployment

See [UPGRADE.md](UPGRADE.md) for the two new settings/resources and the verification steps. Your existing memory-wall Redis keys are unchanged.

## Deploy to Vercel

1. Import this project through your Git repository, or run `npx vercel` from this directory after signing into Vercel. Use **Other** as the framework preset; `vercel.json` specifies the public directory and build check.
2. In Vercel, add an **Upstash Redis** integration and connect it to this project. Check that `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are available in the production environment. The `KV_REST_API_URL` / `KV_REST_API_TOKEN` aliases are also supported. Choose a plan yourself; this project makes no billing assumptions.
3. Set a long, unique `MEMORY_ADMIN_TOKEN` in Vercel's environment-variable settings. Do not paste it into the public website, source code or chat. This unlocks `/admin.html` for the organiser.
4. Optional: set `MEMORY_REQUIRE_APPROVAL=true` and `MEMORY_POST_CODE` to a code shared with classmates. If approval is enabled, an admin token is required. The public site displays the relevant form fields automatically.
5. For shared photographs, connect a **public Vercel Blob** store to this project. Keep the generated `BLOB_STORE_ID` / OIDC connection or `BLOB_READ_WRITE_TOKEN` server-side. Add `GALLERY_UPLOAD_PASSWORD` as a secret environment variable; use a different value from `MEMORY_ADMIN_TOKEN`. Scope these values to the intended deployment environment.
6. Redeploy after changing environment variables. Open `/api/memories` and verify `available:true`, then submit a note and verify it from a second browser. Check `/api/photos` for `available:true`, upload a photo with the class password, then refresh the album from another browser.
7. Verify the deployment's visitor access setting allows the intended classmates to open it. Share the production URL.

Until Redis is connected, the gallery and card maker work, and the wall clearly says it is not open yet. The API returns an error for submissions; it never pretends a browser-only note was shared.

## Manage the memory wall

Visit `/admin.html`, enter the private organiser passphrase, and publish or hide notes. The page can publish or hide contributed photos too, and exports notes plus photo metadata/URLs as a JSON archive (not the image bytes). The passphrase is held in memory only. Hiding is reversible. Contributors can remove their own notes from the browser where they posted; their deletion token stays in that browser and is never returned in public reads.

The wall accepts named text notes (up to 600 characters). The text wall and shared photo album are separate. The 15 original pictures remain in `public/gallery.json`; new pictures appear in the album after a password-authorised upload. A shared password limits posting but does not verify someone’s identity. The album and image URLs are public; hiding a photo removes it from the album but does not revoke the direct file URL. To remove a file entirely, delete it through your Blob dashboard. Portraits used in the card maker stay on the visitor's device. Public notes are rendered as text, never HTML. Do not rename these mechanisms as verified identities: the site does not verify a contributor's name.

## Content and editing

- The class name and department are taken from the supplied exam-wish and FYB posters. The posters themselves are not published.
- `public/class-names.json`: 50 editable name suggestions transcribed from the poster. Users can type corrections, preferred spellings or nicknames. Please review spellings before announcing the site.
- `public/gallery.json`: photograph captions and categories. Captions are editorial descriptions, not attributed quotations or claims about individual identities.
- `public/utils.js`: the sign-out time. Change it here if the timetable changes.
- `public/card.js`: downloadable card artwork and portrait layouts.
- `public/countdown-share.js`: live countdown artwork and snapshot exports.
- `public/photo-upload.js`, `api/photos.js`, `lib/photo-service.mjs`: shared photo contributions.
- `public/styles.css`: site design and responsive layouts.
- `scripts/photo-selection.json`: included and omitted original filenames. Source uploads have not been deleted or changed.

## Storage and export

Redis keeps notes in `invincibles26:notes` and photo metadata in `invincibles26:photos`. The image bytes go to your public Vercel Blob store, never to Redis. Photos are resized to at most 1600 pixels on the longest side and re-encoded as WebP, stripping EXIF metadata. Server uploads enforce image decoding, input size/pixel limits, origin checks, consent and rate limits. Stable upload IDs make completed retries idempotent. Notes do not expire; the short-lived rate-limit keys do. The Vercel project, database and domain should remain under your account. Export the memory archive after sign-out and retain the source archive and photographs.

## Technical references

- Vercel Node.js functions: https://vercel.com/docs/functions/runtimes/node-js
- Vercel configuration: https://vercel.com/docs/project-configuration/vercel-json
- Upstash Redis REST API: https://upstash.com/docs/redis/features/restapi

Fonts: Barlow Condensed, DM Sans and DM Serif Display from Google Fonts, under the SIL Open Font License. Included license files are under `public/assets/fonts/`.
