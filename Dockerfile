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

# Copy standalone build from builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Railway sets PORT environment variable
ENV PORT=3000

# Expose the port that Next.js runs on
EXPOSE 3000

# Use standalone server for production
CMD ["node", "server.js"]