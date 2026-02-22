# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Puppeteer configuration
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy backend application code
COPY --chown=nodejs:nodejs backend/ .

# Switch to non-root user
USER nodejs

# Expose port (Railway overrides with $PORT env var)
EXPOSE 5000

# Use startup script with explicit logging
CMD ["sh", "./start.sh"]
