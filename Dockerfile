# Use the official Node.js 18 Alpine image for smaller size
FROM node:18-alpine AS builder

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

# Production stage
FROM node:18-alpine AS runner

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

# Expose the port that Next.js runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Start the application
CMD ["npm", "start"]