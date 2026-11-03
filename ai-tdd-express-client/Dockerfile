FROM node:22-slim

WORKDIR /app

ENV PORT=3000

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

EXPOSE 3000

CMD ["yarn", "dev"]
