# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy all source files
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM node:18-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Set production environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application and all necessary files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/app ./app
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/components ./components
COPY --from=builder /app/types ./types
COPY --from=builder /app/middleware.ts ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/sentry.*.config.ts ./
COPY --from=builder /app/postcss.config.js ./
COPY --from=builder /app/tailwind.config.ts ./

# Expose port (Railway will override with PORT env var)
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]