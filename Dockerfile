FROM node:22-bookworm-slim AS build

ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && rm -rf .next/cache

FROM build AS migrate
CMD ["npm", "run", "db:migrate"]

FROM node:22-bookworm-slim AS runtime

# Puppeteer needs Chromium. Chinese templates also bundle and embed the
# licensed Noto font from public/fonts; system fonts provide a fallback.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium fonts-noto-cjk fonts-noto-cjk-extra ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    TZ=Asia/Taipei

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/start-hosted.sh ./scripts/start-hosted.sh
COPY --from=build /app/data/i18n ./data/i18n
COPY --from=build /app/data/import-templates ./data/import-templates
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
CMD ["npm", "start"]
