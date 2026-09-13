# 1. Build Stage
FROM node:22 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy all file and prisma setting
COPY . .

RUN npx prisma generate
RUN npm run build
#RUN npm prune --omit=dev

# Production Stage
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules 

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
#CMD ["node", "dist/index.js"]