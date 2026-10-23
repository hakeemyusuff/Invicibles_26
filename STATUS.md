# Update verification — 23 October 2026

The original website is deployed by the owner and its shared memory wall works. This update is prepared for that existing deployment.

## Verified locally

- Sixteen automated tests pass, covering the original memory wall and countdown plus photo authentication, persistence across database reopens, idempotent retry, input validation, consent, origin checks, request size, rate limiting, moderation and storage-failure recovery.
- Real image processing tests confirm portrait orientation, 1600-pixel resizing, WebP output, EXIF removal and rejection of oversized pixel dimensions.
- Browser: portrait photo in both card formats; long name/quote rendering; theme controls; exported Story card downloaded and decoded at 1080 × 1920.
- Browser: live countdown preview; snapshot downloaded and decoded at 1080 × 1920; copy-link targets `/#countdown`.
- Browser: multiple-photo selection; incorrect password rejected; correct local test password saves two photos; a fresh view still shows both after restarting the preview server.
- Mobile: 390px and 320px frames (375px/305px content areas with desktop scrollbars); page and new dialogs have no horizontal overflow; long dialogs scroll vertically.
- Build checks JavaScript syntax, linked assets, 30 valid WebP variants and 50 editable class-name suggestions.

## Production activation

Shared photo uploads require a public Vercel Blob store and `GALLERY_UPLOAD_PASSWORD` in addition to the existing Redis credentials. Follow `UPGRADE.md`, deploy, and verify an upload against the actual Blob/Redis connection. Local QA uses isolated SQLite/files; it does not verify production storage credentials.

Native OS share sheets depend on browser/device support. Unsupported browsers download the image for manual sharing. A downloaded countdown is a snapshot; the shared link opens the live timer.
