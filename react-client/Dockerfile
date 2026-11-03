# syntax=docker/dockerfile:1
# BUILDER
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# RUNTIME: static files behind nginx, falling back to index.html for client-side routes
FROM nginx:1.27-alpine
COPY <<'CONF' /etc/nginx/conf.d/default.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
CONF
COPY --from=builder /app/dist /usr/share/nginx/html
