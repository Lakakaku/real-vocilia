# Multi-stage build for optimized production image
FROM node:18-alpine AS deps
# Install dependencies needed for node-gyp
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
# Install dependencies with cache mount to speed up rebuilds
RUN npm ci

# Build stage
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache libc6-compat

# Create a non-root user to run the app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy the entire .next directory
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules

# Copy all source files needed at runtime
COPY --from=builder /app/app ./app
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/components ./components
COPY --from=builder /app/types ./types
COPY --from=builder /app/middleware.ts ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tsconfig.json ./

# Set environment variables
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set PORT for Railway
ENV PORT 3000

# Start the application
CMD ["npm", "start"]