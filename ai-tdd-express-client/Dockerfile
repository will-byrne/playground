# node runs the app (ts-node); bun installs dependencies
FROM node:22-slim
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

ENV PORT=3000

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

EXPOSE 3000

CMD ["bun", "run", "dev"]
