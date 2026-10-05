# Scaffold

Starting configuration. Copy these to the repository root in phase 1, then delete this
folder.

| File | Note |
|---|---|
| `package.json` | Pinned to the stack in `CLAUDE.md`. Versions are indicative — take current stable |
| `docker-compose.yml` | app, postgres, minio, caddy. One office VM |
| `Dockerfile` | **Installs `fonts-noto-cjk`.** Without it every Chinese glyph in a generated PDF is a box |
| `.env.example` | Copy to `.env`. `TRANSLATION_API_KEY` is for after-sales cases only |
| `tsconfig.json` | `strict` and `noUncheckedIndexedAccess` both on |
| `drizzle.config.ts` | |

Also needed and not included: `Caddyfile`, `next.config.ts`, `tailwind.config.ts`,
`postcss.config.js`, `.eslintrc.json`, `playwright.config.ts`, `vitest.config.ts`. Generate
those in phase 1.

Download Noto Sans TC into `public/fonts/` and reference it in the document templates
rather than relying on the system font, even though the image installs it — the templates
must be self-contained.
