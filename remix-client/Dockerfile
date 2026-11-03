# syntax=docker/dockerfile:1
# BUILDER: bun for installs (bun.lock), node for the Remix/Vite toolchain
FROM node:22-slim AS builder
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN npm run build
RUN bun install --frozen-lockfile --production

# RUNTIME
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npx", "remix-serve", "./build/server/index.js"]
