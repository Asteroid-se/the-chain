FROM node:22-bookworm-slim

WORKDIR /app
ARG YTDLP_VERSION=2026.08.19
ARG YTDLP_SHA256=1fa6733c37ea6fb51c99ad8fe785e7b7e5f3246c9b980230329d4fb72ed8d4d6
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl python3 ffmpeg \
    && curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp" -o /usr/local/bin/yt-dlp \
    && echo "${YTDLP_SHA256}  /usr/local/bin/yt-dlp" | sha256sum -c - \
    && chmod 0755 /usr/local/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir /app/data /app/storage && chown node:node /app/data /app/storage
ENV NODE_ENV=production
ENV DATABASE_URL=file:../data/chain.db
USER node
EXPOSE 3000

CMD ["npm", "run", "start:container"]
