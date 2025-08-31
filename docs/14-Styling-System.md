# Styling System & UI Components

This document covers the comprehensive styling architecture using TailwindCSS v4, HeroUI components, custom CSS patterns, and theming system.

## Styling Stack Overview

```
Styling Architecture:
├── TailwindCSS v4 (utility-first CSS framework)
├── HeroUI (React component library)
├── Custom CSS Variables (brand colors)
├── PostCSS (processing pipeline)
└── Custom Components (layout & interactive elements)
```

### Core Configuration

#### PostCSS Configuration (`postcss.config.mjs`)
```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // TailwindCSS v4 integration
  },
}
export default config
```

#### TailwindCSS Integration (`styles.css`)
```css
@import 'tailwindcss';
@import 'mapbox-gl/dist/mapbox-gl.css'; /* Mapbox GL styles */
@plugin './hero.ts'; /* HeroUI plugin */
@source '../../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}';
@custom-variant dark (&:is(.dark *)); /* Dark mode support */
```

## Custom CSS Variables & Brand Colors

### Color Palette Definition
```css
:root {
  --font-mono: 'Roboto Mono', monospace;
  --carrot: #d97706;    /* Primary orange */
  --orange: #ac5e04;    /* Darker orange */
  --squash: #fbbf24;    /* Yellow accent */
  --barn: #2f3e46;      /* Dark blue-gray */
  --bone: #fcf8f3;      /* Off-white */
}
```

**Usage Pattern:**
```css
/* CSS */
background-color: var(--carrot);

/* TailwindCSS utility classes */
<div className="bg-orange-600"> /* Maps to --carrot */
```

### Typography Scale
```css
h1 { @apply text-7xl my-4; }  /* 4.5rem / 72px */
h2 { @apply text-6xl my-4; }  /* 3.75rem / 60px */
h3 { @apply text-5xl my-4; }  /* 3rem / 48px */
h4 { @apply text-4xl my-4; }  /* 2.25rem / 36px */
h5 { @apply text-3xl my-4; }  /* 1.875rem / 30px */
h6 { @apply text-2xl my-4; }  /* 1.5rem / 24px */
```

**Benefits:**
- Consistent heading hierarchy
- Automatic margins for spacing
- Responsive scaling via TailwindCSS

## HeroUI Integration

### HeroUI Plugin Configuration (`hero.ts`)
```typescript
import { heroui } from '@heroui/react'
export default heroui()
```

### Component Import Patterns
```typescript
// Individual component imports (recommended for bundle size)
import { Button } from '@heroui/button'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Input } from '@heroui/input'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/modal'

// Usage example
export function ExampleComponent() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <h3>Farm Details</h3>
      </CardHeader>
      <CardBody>
        <Input
          label="Farm Name"
          placeholder="Enter farm name"
          variant="bordered"
        />
        <Button color="primary" variant="solid">
          Save Farm
        </Button>
      </CardBody>
    </Card>
  )
}
```

### Available HeroUI Components

The project includes comprehensive HeroUI components:

```typescript
// Layout & Navigation
import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from '@heroui/navbar'
import { Breadcrumbs, BreadcrumbItem } from '@heroui/breadcrumbs'
import { Divider } from '@heroui/divider'

// Data Display
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card'
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from '@heroui/table'
import { Avatar } from '@heroui/avatar'
import { Badge } from '@heroui/badge'
import { Chip } from '@heroui/chip'
import { Image } from '@heroui/image'

// Form Controls
import { Input } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import { Checkbox } from '@heroui/checkbox'
import { Radio, RadioGroup } from '@heroui/radio'
import { Switch } from '@heroui/switch'
import { Slider } from '@heroui/slider'

// Feedback
import { Button } from '@heroui/button'
import { Spinner } from '@heroui/spinner'
import { Progress } from '@heroui/progress'
import { Skeleton } from '@heroui/skeleton'

// Overlay
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { Popover, PopoverTrigger, PopoverContent } from '@heroui/popover'
import { Tooltip } from '@heroui/tooltip'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/dropdown'
```

## Custom Component Patterns

### Layout Components

#### Navbar Component (`components/Navbar.tsx`)
```typescript
'use client'

import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button } from '@heroui/react'
import { useAuth } from '../hooks/useAuth'
import Link from 'next/link'

export function AppNavbar() {
  const { user, isLoading } = useAuth()
  
  return (
    <Navbar isBordered className="bg-white/80 backdrop-blur-sm">
      <NavbarBrand>
        <Link href="/" className="font-bold text-inherit">
          🚜 Farmshop Finder
        </Link>
      </NavbarBrand>
      
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarItem>
          <Link href="/farms" className="text-foreground">
            Browse Farms
          </Link>
        </NavbarItem>
        
        {user?.role === 'farmer' && (
          <NavbarItem>
            <Link href="/dashboard" className="text-foreground">
              My Farm
            </Link>
          </NavbarItem>
        )}
      </NavbarContent>
      
      <NavbarContent justify="end">
        {isLoading ? (
          <Spinner size="sm" />
        ) : user ? (
          <Dropdown>
            <DropdownTrigger>
              <Button variant="light">
                {user.name || user.email}
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem key="profile">Profile</DropdownItem>
              <DropdownItem key="logout" color="danger">
                Logout
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        ) : (
          <div className="flex gap-2">
            <Button as={Link} href="/login" variant="light">
              Login
            </Button>
            <Button as={Link} href="/signup" color="primary">
              Sign Up
            </Button>
          </div>
        )}
      </NavbarContent>
    </Navbar>
  )
}
```

#### Farm Card Component (`components/FarmCard.tsx`)
```typescript
import { Card, CardBody, CardHeader, Image, Button, Chip } from '@heroui/react'
import { Farm } from '@/payload-types'
import Link from 'next/link'

interface FarmCardProps {
  farm: Farm
}

export function FarmCard({ farm }: FarmCardProps) {
  const productCount = farm.products?.length || 0
  const hasLocation = farm.geo?.lat && farm.geo?.lng
  
  return (
    <Card className="max-w-sm hover:shadow-lg transition-shadow">
      <CardHeader className="p-4">
        {farm.image && (
          <Image
            src={farm.image.url}
            alt={farm.image.alt || farm.name}
            className="w-full h-48 object-cover rounded-lg"
          />
        )}
      </CardHeader>
      
      <CardBody className="pt-0">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold">{farm.name}</h3>
          {hasLocation && (
            <Chip size="sm" variant="flat" color="success">
              📍 Mapped
            </Chip>
          )}
        </div>
        
        {farm.location && (
          <p className="text-sm text-gray-600 mb-2">
            📍 {farm.location}
          </p>
        )}
        
        <p className="text-sm text-gray-500 mb-3">
          {productCount} products available
        </p>
        
        <Button
          as={Link}
          href={`/farms/${farm.slug}`}
          color="primary"
          variant="solid"
          fullWidth
        >
          View Details
        </Button>
      </CardBody>
    </Card>
  )
}
```

### Form Components

#### Farm Form with HeroUI
```typescript
'use client'

import { useState } from 'react'
import { Input, Textarea, Button, Card, CardBody, CardHeader } from '@heroui/react'
import { createFarm } from '../actions/farmActions'

export function FarmCreateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setErrors({})
    
    try {
      await createFarm(formData)
      // Redirect handled by server action
    } catch (error: any) {
      setErrors({ general: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold">Create Your Farm</h2>
      </CardHeader>
      
      <CardBody>
        <form action={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {errors.general}
            </div>
          )}
          
          <Input
            name="name"
            label="Farm Name"
            placeholder="Enter your farm name"
            isRequired
            variant="bordered"
          />
          
          <Input
            name="location"
            label="Location"
            placeholder="City, State or Address"
            isRequired
            variant="bordered"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="lat"
              label="Latitude"
              placeholder="40.7128"
              type="number"
              step="any"
              isRequired
              variant="bordered"
            />
            <Input
              name="lng"
              label="Longitude"
              placeholder="-74.0060"
              type="number"
              step="any"
              isRequired
              variant="bordered"
            />
          </div>
          
          <Textarea
            name="description"
            label="Description"
            placeholder="Tell customers about your farm..."
            variant="bordered"
          />
          
          <Button
            type="submit"
            color="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Creating Farm...' : 'Create Farm'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
```

## Responsive Design Patterns

### Mobile-First Approach
```typescript
// TailwindCSS responsive classes follow mobile-first pattern
<div className="
  grid 
  grid-cols-1       /* Mobile: 1 column */
  md:grid-cols-2    /* Tablet: 2 columns */
  lg:grid-cols-3    /* Desktop: 3 columns */
  xl:grid-cols-4    /* Large desktop: 4 columns */
  gap-4 
">
  {farms.map(farm => <FarmCard key={farm.id} farm={farm} />)}
</div>
```

### Responsive Navigation
```typescript
<NavbarContent className="hidden sm:flex gap-4" justify="center">
  {/* Desktop navigation */}
</NavbarContent>

<NavbarMenuToggle className="sm:hidden" />
<NavbarMenu>
  {/* Mobile navigation menu */}
</NavbarMenu>
```

## Dark Mode Support

### CSS Custom Variant
```css
@custom-variant dark (&:is(.dark *));
```

### Theme Toggle Implementation
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@heroui/button'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  
  useEffect(() => {
    const theme = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = theme === 'dark' || (!theme && systemDark)
    
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
  }, [])
  
  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newTheme)
  }
  
  return (
    <Button
      variant="light"
      isIconOnly
      onPress={toggleTheme}
      aria-label="Toggle theme"
    >
      {isDark ? '🌞' : '🌙'}
    </Button>
  )
}
```

### Dark Mode Color Adjustments
```css
/* Light mode */
.bg-background { background-color: #ffffff; }
.text-foreground { color: #11181c; }

/* Dark mode */
.dark .bg-background { background-color: #000000; }
.dark .text-foreground { color: #ecedee; }
```

## Animation & Transitions

### HeroUI Motion Integration
```typescript
import { Button } from '@heroui/button'
import { motion } from 'framer-motion'

export function AnimatedCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="transform-gpu" // Use GPU acceleration
    >
      {children}
    </motion.div>
  )
}
```

### CSS Transitions
```css
/* Hover effects */
.farm-card {
  @apply transition-all duration-300 ease-in-out;
  @apply hover:shadow-lg hover:-translate-y-1;
}

/* Loading states */
.loading-skeleton {
  @apply animate-pulse bg-gray-200 dark:bg-gray-700;
}
```

## Performance Optimizations

### Bundle Size Optimization
```typescript
// ✅ Individual imports (better tree shaking)
import { Button } from '@heroui/button'
import { Card } from '@heroui/card'

// ❌ Avoid barrel imports in production
import { Button, Card } from '@heroui/react'
```

### CSS Purging
TailwindCSS v4 automatically removes unused styles in production builds.

### Critical CSS Loading
```typescript
// In app/layout.tsx
import './globals.css' // Contains critical styles

// Non-critical styles loaded asynchronously
useEffect(() => {
  import('./non-critical.css')
}, [])
```

## Accessibility (A11Y) Features

### HeroUI Built-in Accessibility
```typescript
// HeroUI components include ARIA attributes by default
<Button 
  aria-label="Add to cart"
  isDisabled={isLoading}
  color="primary"
>
  {isLoading ? <Spinner size="sm" /> : 'Add to Cart'}
</Button>

// Focus management
<Modal isOpen={isOpen} onOpenChange={setIsOpen}>
  <ModalContent>
    {/* Focus automatically managed */}
  </ModalContent>
</Modal>
```

### Custom Accessibility Enhancements
```typescript
// Skip links for keyboard navigation
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50"
>
  Skip to main content
</a>

// Screen reader announcements
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>
```

## Component Library Organization

### File Structure
```
src/app/(frontend)/components/
├── ui/                 # Reusable UI components
│   ├── Button.tsx      # Custom button variants
│   ├── Input.tsx       # Enhanced input components
│   └── Modal.tsx       # Modal wrappers
├── layout/             # Layout components
│   ├── Navbar.tsx      # Navigation bar
│   ├── Footer.tsx      # Site footer
│   └── Sidebar.tsx     # Sidebar layouts
├── farm/               # Farm-specific components
│   ├── FarmCard.tsx    # Farm display card
│   ├── FarmForm.tsx    # Farm creation/edit
│   └── FarmDetail.tsx  # Farm detail view
└── common/             # Shared components
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    └── SEOHead.tsx
```

### Component Export Pattern
```typescript
// components/index.ts
export { AppNavbar } from './layout/Navbar'
export { FarmCard } from './farm/FarmCard'
export { LoadingSpinner } from './common/LoadingSpinner'

// Usage
import { AppNavbar, FarmCard } from '@/components'
```

---
Next: `15-Deployment-Guide.md` for comprehensive Vercel deployment and environment setup documentation.