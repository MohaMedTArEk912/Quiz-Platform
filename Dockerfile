# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Build-time arguments for environment variables
ARG VITE_API_URL=/api
ARG VITE_APP_URL=http://localhost:7860
ARG VITE_GOOGLE_CLIENT_ID=

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source files needed for build
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY eslint.config.js ./
COPY index.html ./
COPY scripts/ ./scripts/
COPY src/ ./src/
COPY public/ ./public/

# Build the frontend with environment variables
RUN VITE_API_URL=${VITE_API_URL} \
    VITE_APP_URL=${VITE_APP_URL} \
    VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID} \
    npm run build

# ============================================
# Stage 2: Production Runtime
# ============================================
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production && \
    npm cache clean --force

# Copy server code
COPY server/ ./server/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Copy public files (quizzes, etc.)
COPY public/ ./public/

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && \
    chown -R node:node /app

# Use non-root user for security
USER node

# Environment variables
ENV NODE_ENV=production \
    PORT=7860

# Expose port
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7860/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server/index.js"]
