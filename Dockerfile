# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy all source files
COPY . .

# Accept build arguments for environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM node:20-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Set production environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy package files
COPY package*.json ./

# Copy the standalone output from the build stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose port (Railway will override with PORT env var)
EXPOSE 3000

# Start the Next.js standalone server
CMD ["node", "server.js"]