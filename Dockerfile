FROM node:22-bookworm-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

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
