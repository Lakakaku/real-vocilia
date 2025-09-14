# Suggested Commands for Vocilia Development

## Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Git Commands (Darwin/macOS)
```bash
# Basic git operations
git status
git add .
git commit -m "message"
git push
git pull

# Branch operations
git checkout -b feature/new-feature
git merge main
git branch -d feature/old-feature
```

## File Operations (Darwin/macOS)
```bash
# Navigation
ls -la          # List files with details
cd directory    # Change directory
pwd             # Print working directory

# File operations
cat filename    # Display file contents
grep "search"   # Search in files
find . -name "*.ts"  # Find TypeScript files
```

## Database Commands (Supabase)
```bash
# View tables in dashboard
# https://supabase.com/dashboard/project/ervnxnbxsaaeakbvwieh

# SQL queries via dashboard or API
# Use Supabase SQL editor for schema changes
```

## Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

## Testing Commands
```bash
# Test with real but minimal data
# Create test business account
# Use small transaction amounts (1-5 SEK)
# Test with actual phone numbers
# Delete test accounts when done
```

## Deployment
```bash
# Auto-deploy via Vercel on push to main
git push origin main

# Manual deployment check
# Visit Vercel dashboard for deployment status
```

## Monitoring
```bash
# Check logs in Vercel dashboard
# Monitor errors in Sentry
# View database performance in Supabase
```