# Development Workflow & Commands Reference

This document provides a comprehensive guide for development workflows, command references, testing strategies, and maintenance procedures.

## Development Environment Setup

### Prerequisites

```bash
# Required software versions
Node.js: ^18.20.2 || >=20.9.0
pnpm: ^9 || ^10 (preferred package manager)
Git: Latest version
MongoDB: 4.4+ (for local development)
```

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/Teomago/farmshop-finder-test.git
cd farmshop-finder-test

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 4. Generate Payload types
npm run generate:types

# 5. Start development server
npm run dev
```

### Environment Configuration

#### Local Development (`.env.local`)
```bash
# Database (local MongoDB or MongoDB Atlas)
DATABASE_URI=mongodb://localhost:27017/farmshop-dev
# or: mongodb+srv://user:pass@cluster.mongodb.net/farmshop-dev

# Payload CMS
PAYLOAD_SECRET=development-secret-key-minimum-32-characters

# Site URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000

# Optional: Mapbox (for map development)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-development-token

# Optional: S3 Storage (can use local files in dev)
S3_BUCKET=your-dev-bucket
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com

# Optional: Email testing
BREVO_API_KEY=your-dev-api-key
BREVO_EMAILS_ACTIVE=false  # Set to false in development
```

## Command Reference

### Core Development Commands

```bash
# Development server (hot reload enabled)
npm run dev
# Starts on http://localhost:3000
# Admin panel: http://localhost:3000/admin

# Alternative: Clean development start
npm run devsafe
# Removes .next directory and starts fresh

# Production build
npm run build
# Optimized build for production deployment

# Start production server
npm run start
# Runs built application (requires npm run build first)
```

### Payload CMS Commands

```bash
# Generate TypeScript types from collections/globals
npm run generate:types
# Creates/updates src/payload-types.ts

# Generate admin import map
npm run generate:importmap
# Updates admin panel import mappings

# Access Payload CLI directly
npm run payload
# Interactive CLI for database operations

# Examples of direct Payload CLI usage:
npm run payload -- --help
npm run payload -- migrate
npm run payload -- seed
```

### Code Quality Commands

```bash
# Linting
npm run lint
# Runs ESLint with Next.js configuration

# Type checking
npx tsc --noEmit
# Runs TypeScript compiler without generating files

# Format code (if Prettier is configured)
npx prettier --write .
```

### Testing Commands

```bash
# Run all tests (integration + e2e)
npm run test

# Integration tests only (Vitest)
npm run test:int
# Fast unit/integration tests

# End-to-end tests only (Playwright)
npm run test:e2e
# Browser-based testing

# Watch mode for integration tests
npx vitest
# Runs tests in watch mode during development
```

## Development Workflows

### 1. Feature Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-cart-functionality

# 2. Make changes and test frequently
npm run dev  # Keep development server running
npm run test:int  # Run integration tests

# 3. Generate types if collections changed
npm run generate:types

# 4. Test build before committing
npm run build

# 5. Commit and push
git add .
git commit -m "feat: add cart quantity management"
git push origin feature/new-cart-functionality

# 6. Create pull request for review
```

### 2. Collection Schema Changes

```bash
# 1. Modify collection file (e.g., src/collections/Farms.ts)
# 2. Generate new types
npm run generate:types

# 3. Update any server actions using the collection
# 4. Update client components if TypeScript errors
# 5. Test all affected functionality
npm run dev  # Check admin panel
npm run test:int  # Run integration tests

# 6. Build to verify all types are correct
npm run build
```

### 3. Adding New Dependencies

```bash
# Add production dependency
npm install @some/library

# Add development dependency  
npm install -D @types/some-library

# After adding dependencies, verify build
npm run build

# Commit package.json and package-lock.json
git add package*.json
git commit -m "deps: add library for feature X"
```

## Database Management

### Local MongoDB Setup

```bash
# Option 1: MongoDB via Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Option 2: Local MongoDB installation
# macOS: brew install mongodb-community
# Ubuntu: apt install mongodb
# Windows: Download from mongodb.com

# Connect to local MongoDB
mongodb://localhost:27017/farmshop-dev
```

### Database Operations

```bash
# Access MongoDB shell
mongosh "mongodb://localhost:27017/farmshop-dev"

# Common operations
show dbs
use farmshop-dev
show collections
db.farms.find()
db.users.countDocuments()

# Drop database (careful!)
db.dropDatabase()
```

### Data Seeding

```javascript
// Create sample data via admin panel or script
// Example: seed-data.js
const { getPayload } = require('payload')
const config = require('./src/payload.config.ts')

async function seedData() {
  const payload = await getPayload({ config })
  
  // Create sample users
  await payload.create({
    collection: 'users',
    data: {
      email: 'farmer@example.com',
      password: 'password123',
      role: 'farmer',
      name: 'John Farmer'
    }
  })
  
  // Create sample farm
  await payload.create({
    collection: 'farms',
    data: {
      name: 'Green Valley Farm',
      location: 'Vermont, USA',
      geo: { lat: 44.2601, lng: -72.5806 },
      owner: userId,
      products: []
    }
  })
}

// Run: node seed-data.js
```

## Testing Strategy

### Integration Tests (Vitest)

```typescript
// tests/integration/auth.test.ts
import { describe, it, expect } from 'vitest'
import { login } from '@/app/(frontend)/login/actions/login'

describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    const result = await login({
      email: 'test@example.com',
      password: 'password123'
    })
    
    expect(result.success).toBe(true)
  })
  
  it('should reject invalid credentials', async () => {
    const result = await login({
      email: 'test@example.com',
      password: 'wrongpassword'
    })
    
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
```

### End-to-End Tests (Playwright)

```typescript
// tests/e2e/farm-creation.spec.ts
import { test, expect } from '@playwright/test'

test('farmer can create farm', async ({ page }) => {
  // Login as farmer
  await page.goto('/login')
  await page.fill('[name="email"]', 'farmer@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  // Navigate to farm creation
  await page.goto('/dashboard')
  await page.click('text=Create Farm')
  
  // Fill farm details
  await page.fill('[name="name"]', 'Test Farm')
  await page.fill('[name="location"]', 'Test Location')
  await page.fill('[name="lat"]', '40.7128')
  await page.fill('[name="lng"]', '-74.0060')
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Verify creation
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('text=Test Farm')).toBeVisible()
})
```

### Test Database Setup

```bash
# Use separate test database
# test.env
DATABASE_URI=mongodb://localhost:27017/farmshop-test
PAYLOAD_SECRET=test-secret-key

# Clean test database between tests
beforeEach(async () => {
  await payload.delete({
    collection: 'users',
    where: {} // Delete all
  })
})
```

## Debugging Strategies

### 1. Server-Side Debugging

```typescript
// Add debugging to server actions
export async function createFarm(formData: FormData) {
  console.log('createFarm called with:', Object.fromEntries(formData))
  
  try {
    const result = await payload.create({
      collection: 'farms',
      data: farmData
    })
    console.log('Farm created:', result.id)
    return { success: true, farm: result }
  } catch (error) {
    console.error('Farm creation failed:', error)
    throw error
  }
}
```

### 2. Client-Side Debugging

```typescript
// Debug React Query cache
import { useQueryClient } from '@tanstack/react-query'

function DebugButton() {
  const queryClient = useQueryClient()
  
  const logCache = () => {
    console.log('Query cache:', queryClient.getQueryCache().getAll())
  }
  
  return <button onClick={logCache}>Log Cache</button>
}
```

### 3. Database Query Debugging

```typescript
// Enable MongoDB query logging
const mongooseOptions = {
  uri: process.env.DATABASE_URI,
  options: {
    debug: process.env.NODE_ENV === 'development'
  }
}
```

## Performance Monitoring

### 1. Build Analysis

```bash
# Analyze bundle size
ANALYZE=true npm run build

# Check for large dependencies
npx webpack-bundle-analyzer .next/static/chunks/*.js
```

### 2. Runtime Performance

```typescript
// Add performance marks
export async function expensiveOperation() {
  performance.mark('operation-start')
  
  // ... operation code
  
  performance.mark('operation-end')
  performance.measure('operation', 'operation-start', 'operation-end')
  
  const measures = performance.getEntriesByType('measure')
  console.log('Performance:', measures)
}
```

### 3. Database Performance

```javascript
// MongoDB profiling
db.setProfilingLevel(2) // Profile all operations
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()

// Index analysis
db.farms.explain("executionStats").find({ "geo.lat": { $gte: 40 } })
```

## Maintenance Tasks

### 1. Dependency Updates

```bash
# Check outdated packages
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install @heroui/react@latest

# Check for security vulnerabilities
npm audit
npm audit fix
```

### 2. Database Maintenance

```bash
# MongoDB maintenance
mongosh --eval "db.runCommand({compact: 'farms'})"
mongosh --eval "db.stats()"

# Payload type regeneration (after schema changes)
npm run generate:types
```

### 3. Log Monitoring

```bash
# Check Vercel logs (production)
npx vercel logs

# Local development logs
# Check terminal running npm run dev
# Check browser console for client errors
# Check Network tab for API failures
```

## Troubleshooting Common Issues

### 1. Build Failures

```bash
# Problem: "Module not found" errors
# Solution: Check imports and file paths
npm run build 2>&1 | grep "Module not found"

# Problem: TypeScript errors
# Solution: Regenerate types and check schema
npm run generate:types
npx tsc --noEmit

# Problem: Memory issues
# Solution: Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=8192" npm run build
```

### 2. Database Connection Issues

```bash
# Problem: "MongooseError: Can't connect"
# Solution: Check connection string and MongoDB status
mongosh "mongodb://localhost:27017/farmshop-dev"

# Problem: "Collection not found"
# Solution: Check collection name in payload.config.ts
```

### 3. Authentication Issues

```bash
# Problem: "Unauthorized" errors
# Solution: Check cookie settings and session
# Clear cookies and re-login
# Check PAYLOAD_SECRET consistency
```

## Git Workflow

### Branch Strategy

```bash
# Main branches
main          # Production-ready code
develop       # Development integration

# Feature branches
feature/cart-improvements
feature/map-enhancements
bugfix/auth-redirect-issue
hotfix/critical-security-fix
```

### Commit Conventions

```bash
# Follow conventional commits
feat: add cart quantity controls
fix: resolve map marker click issue
docs: update API documentation
style: format code with prettier
refactor: optimize database queries
test: add e2e tests for farm creation
chore: update dependencies
```

### Release Process

```bash
# 1. Merge features to develop
git checkout develop
git merge feature/new-feature

# 2. Test thoroughly
npm run test
npm run build

# 3. Merge to main for production
git checkout main
git merge develop

# 4. Tag release
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0

# 5. Deploy to production (Vercel auto-deploys from main)
```

This comprehensive workflow guide ensures efficient development practices and maintainable code quality throughout the project lifecycle.