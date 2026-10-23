# The Invincibles ’26

A digital sign-out celebration for the Agricultural and Environmental Engineering Class of 2026 at the University of Ibadan. A place to count down, make a personal card, and keep the photographs and memories that made the journey.

**[Visit the website](https://aee-invicibles-26.vercel.app)**

## Features

- **Sign-out countdown:** a live timer in West Africa Time, a celebration state, and downloadable countdown images for Status and Stories.
- **Personal card maker:** three designs, portrait photo cropping and zoom, names and quotes, and exports in Feed (1080 × 1350) or Story (1080 × 1920) format.
- **Shared photo album:** curated class photographs alongside password-protected contributions, with captions, categories and batches of up to eight photos.
- **Memory wall:** shared memories, shout-outs and wishes that persist across devices.
- **Organiser tools:** moderation for notes and contributed photos, plus a JSON archive export.

The site is designed for phones and desktops. Card portraits are processed on the visitor’s device; photos submitted to the shared album are uploaded to cloud storage. Countdown images capture a moment, while the shared link opens the running timer.

## Stack

| Layer | Technology |
| --- | --- |
| Interface | HTML, CSS and vanilla JavaScript |
| Card and countdown exports | Canvas API |
| Backend | Node.js functions on Vercel |
| Memories and photo metadata | Upstash Redis |
| Contributed images | Vercel Blob |
| Image processing | Sharp |

## Local development

Requires Node.js 22.13 or newer; Node.js 24 is recommended.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:4173>. Set a local `GALLERY_UPLOAD_PASSWORD` in `.env.local` to try photo contributions. Without Redis credentials, the development server uses SQLite and local image files under the ignored `.data/` directory. With Redis configured, it uses the connected cloud resources; use separate development resources for testing.

```sh
npm test
npm run build
```

The build command checks JavaScript syntax and required page assets. Vercel serves `public/` and deploys the functions in `api/`.

## Project structure

| Path | Purpose |
| --- | --- |
| `public/` | Website, card maker, countdown, gallery and bundled assets |
| `api/` | Memory and photo endpoints |
| `lib/` | Validation, storage and image processing |
| `scripts/` | Local development server and build checks |
| `tests/` | API, persistence, image processing and Blob authentication tests |
| `docs/` | Deployment and operation documentation |

The sign-out date lives in `public/utils.js`. Gallery captions and categories live in `public/gallery.json`, and editable name suggestions live in `public/class-names.json`.

## Deployment

See the [deployment guide](docs/deployment.md) for Vercel, Redis, Blob storage and environment variables. Release-specific changes are documented in [UPGRADE.md](UPGRADE.md).

## Credits

Built by [hakeemyusuff](https://github.com/hakeemyusuff) for The Invincibles ’26.

Typography: Barlow Condensed, DM Sans and DM Serif Display, distributed under the SIL Open Font License. Font licences are included in `public/assets/fonts/`.
