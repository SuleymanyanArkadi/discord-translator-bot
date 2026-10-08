ARG NODE_VERSION=22

# --- Сборка зависимостей (better-sqlite3 — нативный модуль, может потребоваться компиляция) ---
FROM node:${NODE_VERSION}-bookworm-slim AS deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- Рантайм ---
FROM node:${NODE_VERSION}-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# База SQLite хранится в /app/data — сюда монтируется volume
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME ["/app/data"]

USER node
CMD ["node", "src/index.js"]
