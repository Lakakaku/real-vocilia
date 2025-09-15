# Explicitly use Docker Hub official Node.js image to avoid Railway's nixpacks
FROM docker.io/library/node:18-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) for building
RUN npm ci

# Copy all project files
COPY . .

# Build the Next.js application
RUN npm run build

# Production stage - explicitly use Docker Hub to avoid nixpacks
FROM docker.io/library/node:18-alpine AS runner

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/middleware.ts ./
COPY --from=builder /app/app ./app
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/components ./components
COPY --from=builder /app/types ./types

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Railway sets PORT environment variable
ENV PORT=3000

# Expose the port that Next.js runs on
EXPOSE 3000

# Use Railway's PORT environment variable
CMD ["npm", "start"]