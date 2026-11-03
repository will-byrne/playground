# syntax=docker/dockerfile:1
# BUILDER
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

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
