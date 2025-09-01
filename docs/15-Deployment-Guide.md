# Deployment Guide: Vercel Setup & Optimization

This document provides a comprehensive guide for deploying the Farmshop Finder application to Vercel, including optimization strategies, environment configuration, and troubleshooting.

## Vercel Configuration Overview

### Current `vercel.json` Configuration

```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "devCommand": "pnpm run dev",
  "regions": ["lhr1"],
  "functions": {
    "app/**/*.ts": { "maxDuration": 30 },
    "app/**/*.tsx": { "maxDuration": 30 }
  },
  "env": {
    "NODE_OPTIONS": "--no-deprecation --max-old-space-size=8000"
  }
}
```

### Configuration Breakdown

**Build Settings:**
- **buildCommand**: Uses pnpm for faster installs and builds
- **outputDirectory**: Standard Next.js output directory
- **NODE_OPTIONS**: Increased memory allocation (8GB) for complex builds

**Performance Settings:**
- **regions**: London (lhr1) for better EU performance
- **maxDuration**: 30-second timeout for serverless functions
- **Memory allocation**: 8GB during build to handle Payload CMS compilation

## Environment Variables Setup

### Required Environment Variables

#### 1. Core Database & Authentication
```bash
# MongoDB connection (use MongoDB Atlas for production)
DATABASE_URI=mongodb+srv://username:password@cluster.mongodb.net/farmshop?retryWrites=true&w=majority

# Payload CMS secret (generate a strong random string)
PAYLOAD_SECRET=your-very-long-random-secret-key-here-minimum-32-characters
```

#### 2. Site URLs
```bash
# Public site URL (used for SEO, sitemap generation)
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
SITE_URL=https://your-domain.vercel.app
```

#### 3. S3 Storage (Optional but recommended)
```bash
# AWS S3 or compatible storage
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com

# For DigitalOcean Spaces (S3-compatible)
# S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
```

#### 4. Email Service (Optional)
```bash
# Brevo (formerly Sendinblue) for transactional emails
BREVO_API_KEY=your-brevo-api-key
BREVO_EMAILS_ACTIVE=true
BREVO_SENDER_NAME=Farmshop Finder
BREVO_SENDER_EMAIL=noreply@your-domain.com
```

#### 5. Mapbox Integration
```bash
# Mapbox public token for maps
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ciIsImEiOiJ1cHB1In0...
```

### Environment Variable Security

**Vercel Environment Settings:**
1. Go to your project dashboard on Vercel
2. Navigate to Settings → Environment Variables
3. Add each variable with appropriate environment targeting:
   - `Development`: For preview deployments
   - `Preview`: For branch deployments
   - `Production`: For main branch deployments

**Security Best Practices:**
```bash
# ✅ Use strong, unique secrets
PAYLOAD_SECRET=$(openssl rand -base64 32)

# ✅ Use MongoDB Atlas connection strings with authentication
DATABASE_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# ❌ Never commit secrets to version control
# Use .env.local for local development (gitignored)
```

## Build Optimization Strategies

### 1. Memory Management

The application requires significant memory during build due to:
- Payload CMS TypeScript generation
- TailwindCSS v4 compilation  
- HeroUI component bundling
- Mapbox GL JS integration

**Current Optimization:**
```json
{
  "env": {
    "NODE_OPTIONS": "--no-deprecation --max-old-space-size=8000"
  }
}
```

### 2. Build Process Analysis

```bash
# Local build analysis
npm run build

# Expected output:
# ✓ Compiled successfully in ~20-30s
# Route (app)                    Size  First Load JS
# ┌ ƒ /                          521 B    143 kB
# ├ ƒ /farms                     1.95 kB  143 kB  
# ├ ƒ /farms/[slug]              15.5 kB  170 kB
# └ ƒ /dashboard                 3.88 kB  205 kB
```

**Performance Metrics:**
- **Total bundle size**: ~103 kB shared chunks
- **Page sizes**: 1-16 kB individual pages
- **Build time**: 20-30 seconds typical

### 3. Code Splitting Optimization

The application uses automatic code splitting:

```typescript
// Automatic route-based splitting
// Each page in app/ directory is automatically split

// Dynamic imports for heavy components
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false, // Skip SSR for Mapbox components
  loading: () => <Spinner />
})

// Lazy loading for non-critical features
const AdminPanel = lazy(() => import('./AdminPanel'))
```

## Database Setup for Production

### MongoDB Atlas Configuration

1. **Create MongoDB Atlas Account**
   - Sign up at [mongodb.com/atlas](https://mongodb.com/atlas)
   - Create a new project and cluster

2. **Network Access Configuration**
   ```
   IP Whitelist: 0.0.0.0/0 (Allow from anywhere)
   Note: Vercel uses dynamic IPs, so broad access is required
   ```

3. **Database User Setup**
   ```
   Username: farmshop-app
   Password: [Generate strong password]
   Roles: Read and write to any database
   ```

4. **Connection String Format**
   ```
   mongodb+srv://farmshop-app:password@cluster0.abc123.mongodb.net/farmshop?retryWrites=true&w=majority
   ```

### Database Indexes for Performance

```javascript
// Recommended indexes for production
db.farms.createIndex({ "geo.lat": 1, "geo.lng": 1 }) // Geographic queries
db.farms.createIndex({ "slug": 1 }) // URL lookups
db.users.createIndex({ "email": 1 }) // Authentication
db.carts.createIndex({ "user": 1, "status": 1 }) // Cart queries
db.pages.createIndex({ "slug": 1 }) // Page routing
```

## Storage Configuration

### S3-Compatible Storage Setup

#### AWS S3 Setup
```bash
# 1. Create S3 bucket
aws s3 mb s3://farmshop-media-production

# 2. Configure CORS policy
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["https://your-domain.vercel.app"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}

# 3. Set bucket policy for public read access to uploaded files
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::farmshop-media-production/*"
    }
  ]
}
```

#### Alternative: DigitalOcean Spaces
```bash
# More cost-effective alternative
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_BUCKET=farmshop-media
S3_REGION=nyc3
```

## Deployment Process

### 1. Initial Deployment

```bash
# 1. Connect GitHub repository to Vercel
# 2. Configure environment variables
# 3. Deploy

# Or via Vercel CLI
npm i -g vercel
vercel --prod
```

### 2. Deployment Pipeline

```
GitHub → Vercel Integration:
├── Push to main branch → Production deployment
├── Pull request → Preview deployment  
└── Push to other branches → Development deployment
```

### 3. Build Verification Checklist

```bash
# ✅ Pre-deployment checks
- [ ] All environment variables configured
- [ ] Database connection string valid
- [ ] S3 bucket accessible and configured
- [ ] Mapbox token valid and has required permissions
- [ ] Build completes without errors
- [ ] All tests pass (npm run test)
- [ ] Linting passes (npm run lint)
```

## Performance Monitoring

### 1. Vercel Analytics Integration

```typescript
// Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 2. Core Web Vitals Optimization

**Current Performance Targets:**
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms  
- **CLS (Cumulative Layout Shift)**: < 0.1

**Optimization Strategies:**
```typescript
// Image optimization
import { Image } from '@heroui/image'
<Image
  src={farm.image.url}
  alt={farm.name}
  width={400}
  height={300}
  loading="lazy" // Lazy load non-critical images
/>

// Font optimization
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

### 3. Bundle Analysis

```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build

# Expected bundle breakdown:
# - React/Next.js core: ~40KB
# - HeroUI components: ~35KB  
# - Mapbox GL: ~25KB
# - Application code: ~15KB
```

## Troubleshooting Common Issues

### 1. Build Memory Issues

**Problem**: Build fails with "JavaScript heap out of memory"

**Solution**:
```json
{
  "env": {
    "NODE_OPTIONS": "--max-old-space-size=8192"
  }
}
```

### 2. Database Connection Issues

**Problem**: "MongooseServerSelectionError" in production

**Solutions**:
```bash
# 1. Verify connection string
DATABASE_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# 2. Check MongoDB Atlas IP whitelist (0.0.0.0/0)
# 3. Verify database user permissions
# 4. Test connection locally first
```

### 3. Environment Variable Issues

**Problem**: Environment variables not accessible in production

**Solutions**:
```typescript
// ✅ Use NEXT_PUBLIC_ prefix for client-side variables
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.123...

// ✅ Server-side variables (no prefix needed)
DATABASE_URI=mongodb://...
PAYLOAD_SECRET=secret123...

// ❌ Don't access server variables in client components
// This will be undefined in browser:
const secret = process.env.PAYLOAD_SECRET // undefined
```

### 4. Mapbox Integration Issues

**Problem**: Maps not loading in production

**Solutions**:
```typescript
// 1. Verify token is public (starts with pk.)
// 2. Check token permissions include maps
// 3. Ensure domain is whitelisted in Mapbox account
// 4. Use dynamic imports to avoid SSR issues

const MapComponent = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div>Loading map...</div>
})
```

## Domain Configuration

### 1. Custom Domain Setup

```bash
# 1. In Vercel dashboard, go to Domains
# 2. Add your custom domain
# 3. Configure DNS records:

# For apex domain (example.com)
A record: @ → 76.76.19.61

# For subdomain (www.example.com)  
CNAME record: www → cname.vercel-dns.com
```

### 2. SSL Certificate

Vercel automatically provisions SSL certificates for:
- *.vercel.app domains
- Custom domains (Let's Encrypt)

### 3. Redirects Configuration

```json
// vercel.json
{
  "redirects": [
    {
      "source": "/admin",
      "destination": "/admin/",
      "permanent": true
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

## Production Optimization Checklist

### Pre-Launch Checklist

```bash
# Environment & Configuration
- [ ] All environment variables set in Vercel
- [ ] Database connection verified
- [ ] S3 storage configured and accessible
- [ ] Email service configured (if using)
- [ ] Mapbox token valid and configured

# Performance & SEO
- [ ] Sitemap accessible at /sitemap.xml
- [ ] Robots.txt configured at /robots.txt
- [ ] Open Graph images configured
- [ ] Core Web Vitals optimized
- [ ] Bundle size analyzed and optimized

# Security
- [ ] HTTPS enforced
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] API routes protected with authentication

# Functionality Testing
- [ ] User registration/login working
- [ ] Farm creation/editing functional
- [ ] Cart system operational
- [ ] Map integration working
- [ ] Admin panel accessible
- [ ] Email notifications sending (if configured)
```

### Post-Launch Monitoring

```bash
# 1. Set up Vercel Analytics
# 2. Monitor Core Web Vitals
# 3. Check error logs in Vercel dashboard
# 4. Monitor database performance
# 5. Set up uptime monitoring
```

## Scaling Considerations

### Database Scaling
```bash
# MongoDB Atlas auto-scaling
- Enable auto-scaling in cluster settings
- Set appropriate storage limits
- Monitor connection pool usage
```

### CDN & Caching
```bash
# Vercel Edge Network automatically handles:
- Static asset caching
- Image optimization
- Global CDN distribution
```

### Function Limits
```bash
# Vercel Pro limits:
- Function execution: 60 seconds max
- Memory: 3008 MB max
- Bandwidth: 1TB/month
```

---

## Quick Deploy Command Reference

```bash
# Initial setup
git clone <repository>
cd farmshop-finder-test
npm install

# Set environment variables in .env.local
# (Copy from .env.example and fill values)

# Test build locally
npm run build
npm run start

# Deploy to Vercel
npx vercel --prod

# Continuous deployment via GitHub integration recommended
```

This comprehensive deployment guide ensures a smooth production deployment with optimal performance and security configurations.