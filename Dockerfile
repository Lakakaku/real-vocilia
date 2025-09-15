# Use the official Node.js 18 Alpine image for smaller size
FROM node:18-alpine

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all project files
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port that Next.js runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Start the application
CMD ["npm", "start"]