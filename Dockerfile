# Multi-stage Dockerfile for cinma.online Backend
# Optimized for production deployment on Qovery

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts && \
    npm cache clean --force

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application files
COPY package*.json ./
COPY server ./server
COPY src/db ./src/db
COPY .env.example ./.env.example

# Create non-root user for security
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port 8080 (Qovery default)
EXPOSE 8080

# Environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server/index.js"]
