# Stage 1: Build & Dependencies
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install system dependencies needed for native compilation & Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

RUN npm install

COPY . .

ENV DATABASE_URL="postgresql://postgres:eyaeaj0djlbjhybz04ma4vrw7otatabf@172.17.0.1:5432/postgres"
ENV USE_POSTGRES="true"

# Generate Prisma Client for PostgreSQL
RUN npx prisma generate --schema=./prisma/schema.pg.prisma

# Build Frontend Vite assets
RUN npx vite build

# Stage 2: Production Runner
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="postgresql://postgres:eyaeaj0djlbjhybz04ma4vrw7otatabf@172.17.0.1:5432/postgres"
ENV SUPABASE_URL="https://supabase.kontrol-app.com"
ENV SUPABASE_PUBLISHABLE_KEY="sb_publishable_36cfd54f23bbf88d313317_24673797"
ENV VITE_SUPABASE_URL="https://supabase.kontrol-app.com"
ENV VITE_SUPABASE_ANON_KEY="sb_publishable_36cfd54f23bbf88d313317_24673797"
ENV JWT_SECRET="kontrol-app-production-secret-key-98765"

# Copy pre-compiled node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/electron ./electron
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/data/files

EXPOSE 3000

CMD ["node", "server.js"]
