# Multi-stage build: build client, install production deps, run server

FROM node:20-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy source and build frontend
COPY . .
# Build client inside builder
RUN npm --prefix client ci --silent && npm --prefix client run build

# Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --silent

# Copy build artifacts and server
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/.env.example ./

EXPOSE 5000
CMD ["node", "server/index.js"]
