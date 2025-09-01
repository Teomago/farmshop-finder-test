# Configuration & Setup

This document explains the configuration files and setup process for the Farmshop Finder project.

## Core Configuration Files

### `payload.config.ts` - CMS Configuration

The main Payload CMS configuration file that orchestrates the entire backend:

```typescript
import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { seoPlugin } from '@payloadcms/plugin-seo'

export default buildConfig({
  // Admin panel configuration
  admin: {
    user: Admins.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  
  // Collections and Globals registration
  collections: [Admins, Users, Media, Pages, Products, Farms, Home, Carts],
  globals: [Header, Footer, HomeConfig],
  
  // Rich text editor
  editor: lexicalEditor({}),
  
  // Database connection
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  
  // Plugins configuration
  plugins: [
    s3Storage({ /* S3 config */ }),
    nestedDocsPlugin({ /* Nested pages config */ }),
    seoPlugin({ /* SEO fields config */ }),
  ],
  
  // Email configuration
  email: brevoAdapter(),
})
```

**Key Features:**
- **Collections Registration**: All data models are registered here
- **Plugin Integration**: S3 storage, SEO fields, nested documents
- **Database Setup**: MongoDB connection via Mongoose adapter
- **Admin Panel**: Defines which collection can access admin interface

**Interconnections:**
- Used by all server components when calling `getPayload({ config })`
- Referenced in build process for type generation (`pnpm generate:types`)
- Admin panel configuration affects `/admin` routes

### `next.config.mjs` - Next.js Configuration

```javascript
import { withPayload } from '@payloadcms/next/withPayload'

const nextConfig = {
  webpack: (webpackConfig) => {
    // Extension aliasing for better module resolution
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
}

export default withPayload(nextConfig, { 
  devBundleServerPackages: false 
})
```

**Purpose:**
- Integrates Payload CMS with Next.js build process
- Handles TypeScript/JavaScript module resolution
- Enables server-side Payload functionality

### `vercel.json` - Deployment Configuration

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

**Deployment Features:**
- **Build Optimization**: Increased memory allocation for complex builds
- **Function Timeouts**: 30-second limit for serverless functions
- **Regional Deployment**: London region for better EU performance
- **Memory Management**: 8GB memory allocation during build

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URI=mongodb://localhost:27017/farmshop
PAYLOAD_SECRET=your-secret-key-here

# Site URLs
NEXT_PUBLIC_SITE_URL=https://your-domain.com
SITE_URL=https://your-domain.com
```

### S3 Storage (Optional)

```bash
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
```

### Email (Brevo - Optional)

```bash
BREVO_API_KEY=your-brevo-api-key
BREVO_EMAILS_ACTIVE=true
BREVO_SENDER_NAME=Your Farm App
BREVO_SENDER_EMAIL=noreply@yourfarm.com
```

## Development Tools Configuration

### `tsconfig.json` - TypeScript Configuration

Key features for the project:
- Path aliases for cleaner imports (`@/` prefix)
- Strict type checking enabled
- Next.js and React 19 compatibility
- Payload CMS type integration

### `eslint.config.mjs` - Code Quality

- Next.js recommended rules
- TypeScript integration
- Custom rules for Payload CMS patterns

### `playwright.config.ts` - E2E Testing

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'pnpm dev',
    reuseExistingServer: true,
    url: 'http://localhost:3000',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

## Build Process Explained

### 1. Type Generation
```bash
npm run generate:types
```
- Reads all collection/global schemas from `src/collections/` and `src/globals/`
- Generates `src/payload-types.ts` with TypeScript interfaces
- Ensures type safety across the application

### 2. Build Process
```bash
npm run build
```
- Compiles TypeScript to JavaScript
- Optimizes React components
- Generates static pages where possible
- Creates production-ready `.next` folder

### 3. Development Server
```bash
npm run dev
```
- Starts Next.js development server on port 3000
- Enables hot reloading
- Runs both frontend and Payload admin panel

## Configuration Interconnections

```
payload.config.ts
    ↓ (registers collections)
src/collections/*.ts
    ↓ (generates types)
src/payload-types.ts
    ↓ (imported by)
Server Components & Actions
    ↓ (serves data to)
Client Components
```

**Data Flow:**
1. Collections defined in `src/collections/` 
2. Registered in `payload.config.ts`
3. Types generated to `payload-types.ts`
4. Used by server components via `getPayload({ config })`
5. Data passed to client components as props

## Environment-Specific Configuration

### Development
- Uses local MongoDB instance
- Hot reloading enabled
- Debug logging active
- Local file uploads (if S3 not configured)

### Production (Vercel)
- MongoDB Atlas connection
- S3 storage for media files
- Email sending enabled
- Optimized builds with 8GB memory

---
Next: `10-Collections-Deep-Dive.md` for detailed collection schemas and relationships.