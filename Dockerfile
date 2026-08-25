# Stage 1: Build & Dependencies
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install system dependencies needed for compilation & Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Frontend Vite assets
RUN npx vite build

# Stage 2: Production Runner
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/electron ./electron
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js

EXPOSE 3000

CMD ["node", "server.js"]
