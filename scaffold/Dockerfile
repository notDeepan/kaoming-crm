FROM node:22-bookworm-slim

# Puppeteer needs Chromium, and Chinese PDF output needs a CJK font installed
# in the image. Without fonts-noto-cjk every glyph renders as a box.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium fonts-noto-cjk fonts-noto-cjk-extra ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    TZ=Asia/Taipei

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
