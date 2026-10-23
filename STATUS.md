# Build status

The website is implemented and verified locally. It is not deployed yet.

## Verified

- Seven automated checks pass: countdown timezone and boundary, missing production storage, persistence and deletion privacy, validation, moderation, rate limiting, and approval configuration.
- Browser checks: photo upload, portrait and story canvas sizes, long names and quotes, theme switching, keyboard photo positioning, gallery filters and lightbox navigation, memory submission and visibility from another view.
- Responsive layouts inspected at 390 and 320 pixels, without horizontal overflow.
- All 30 optimized image assets and seven local fonts decode successfully.

## Remaining launch steps

The Vercel connection returned a team authorization error. Finish the Vercel sign-in, create the class project, connect Upstash Redis and configure the organiser token, then deploy and repeat the shared-wall test against the live site.

The local memory notes are disposable test data and are excluded from this archive. The production wall intentionally rejects submissions until shared storage is connected.
