# Release notes

## 1.1.1

- Fix photo uploads being disabled when Vercel supplies the OIDC token through request context rather than `process.env`.
- Resolve photo configuration when a request arrives and let the Blob SDK obtain the current authentication token for each operation.
- Replace “One last paper” with “The final stretch” on the countdown artwork, website and sharing text.
- Give disabled buttons an unavailable cursor instead of a waiting cursor.
- Rework the README as public project documentation and move deployment instructions into [docs/deployment.md](docs/deployment.md).

Existing Redis records and Blob files require no migration. Deploy the updated source to apply these fixes.

## 1.1.0

Added portrait photo windows in both personal-card formats, password-protected shared photo contributions, organiser photo moderation, and countdown snapshot sharing.

Photo contributions require Redis, a public Blob store and `GALLERY_UPLOAD_PASSWORD`. See the [deployment guide](docs/deployment.md) for setup and verification.
