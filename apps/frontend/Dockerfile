FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/next start -p ${PORT:-3000}"]
