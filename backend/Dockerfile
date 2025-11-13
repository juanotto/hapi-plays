# Multi-stage Dockerfile for Node.js Hapi application
# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for potential build steps)
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:22-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hapiuser -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source code
COPY --chown=hapiuser:nodejs . .

# Remove development files that shouldn't be in production
RUN rm -rf src/**/*.test.js

# Switch to non-root user
USER hapiuser

# Expose the port the app will run on
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["node", "src/index.js"]