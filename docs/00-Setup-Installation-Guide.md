# Guía Completa de Instalación y Configuración 🚀

## Tabla de Contenido
1. [Prerequisitos del Sistema](#prerequisitos-del-sistema)
2. [Instalación Paso a Paso](#instalación-paso-a-paso)
3. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
4. [Configuración de Librerías Fundamentales](#configuración-de-librerías-fundamentales)
5. [Verificación de la Instalación](#verificación-de-la-instalación)
6. [Solución de Problemas Comunes](#solución-de-problemas-comunes)

---

## Prerequisitos del Sistema

### Versiones Requeridas
```json
{
  "node": "^18.20.2 || >=20.9.0",
  "pnpm": "^9 || ^10"
}
```

### Herramientas Necesarias
- **Node.js**: v20.9.0 o superior
- **pnpm**: v9 o superior (gestor de paquetes recomendado)
- **Git**: Para control de versiones
- **MongoDB**: Base de datos (local o Atlas)
- **Cuenta S3**: Para almacenamiento de archivos (AWS S3 o compatible)

---

## Instalación Paso a Paso

### 1. Clonar el Repositorio
```bash
git clone https://github.com/Teomago/farmshop-finder-test.git
cd farmshop-finder-test
```

### 2. Instalar Dependencias
```bash
# Usar pnpm (recomendado)
pnpm install

# O usar npm si no tienes pnpm
npm install
```

### 3. Configurar Variables de Entorno
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar las variables necesarias
nano .env  # o tu editor preferido
```

---

## Configuración de Variables de Entorno

### Variables Críticas

#### **Base de Datos MongoDB**
```env
# MongoDB Connection
DATABASE_URI=mongodb://localhost:27017/farmshop-finder
# O para MongoDB Atlas:
# DATABASE_URI=mongodb+srv://usuario:password@cluster.mongodb.net/farmshop-finder
```

#### **Payload CMS**
```env
# Payload Secret (Generar una clave segura)
PAYLOAD_SECRET=tu_clave_secreta_muy_larga_y_segura

# URL del Servidor
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
```

#### **Almacenamiento S3**
```env
# AWS S3 o Compatible
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=tu-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=tu-access-key
S3_SECRET_ACCESS_KEY=tu-secret-key
```

#### **Email (Brevo)**
```env
# Brevo Email Service
BREVO_API_KEY=tu_api_key_de_brevo
```

#### **Mapbox (Opcional)**
```env
# Para funcionalidades de mapas
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=tu_mapbox_token
```

---

## Configuración de Librerías Fundamentales

### 1. Payload CMS Configuration

El archivo `src/payload.config.ts` es el corazón de la aplicación:

```typescript
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'

export default buildConfig({
  // Configuración del editor de texto rico
  editor: lexicalEditor(),
  
  // Configuración de la base de datos
  db: mongooseAdapter({
    url: process.env.DATABASE_URI!,
  }),
  
  // Configuración de archivos S3
  plugins: [
    s3Storage({
      collections: {
        media: {
          prefix: 'media',
        },
      },
      bucket: process.env.S3_BUCKET!,
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
        region: process.env.S3_REGION || '',
        endpoint: process.env.S3_ENDPOINT || '',
        forcePathStyle: true,
      },
    }),
  ],
})
```

**¿Por qué esta configuración?**
- **mongooseAdapter**: Conecta Payload con MongoDB de forma optimizada
- **lexicalEditor**: Editor de texto rico moderno para contenido
- **s3Storage**: Almacenamiento escalable para archivos e imágenes

### 2. Next.js Configuration

El archivo `next.config.mjs` integra Payload con Next.js:

```javascript
import { withPayload } from '@payloadcms/next/withPayload'

const nextConfig = {
  webpack: (webpackConfig) => {
    // Configuración para resolver extensiones TypeScript
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

**¿Por qué esta configuración?**
- **withPayload**: Integra automáticamente las rutas de Payload CMS
- **extensionAlias**: Permite usar TypeScript en todas las partes del proyecto
- **devBundleServerPackages**: Optimiza el desarrollo local

### 3. TailwindCSS v4 Configuration

El archivo `postcss.config.mjs` configura el sistema de estilos:

```javascript
import tailwindcss from '@tailwindcss/postcss'

export default {
  plugins: [
    tailwindcss,
  ],
}
```

### 4. TypeScript Configuration

El `tsconfig.json` está optimizado para el proyecto:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Verificación de la Instalación

### 1. Generar Tipos de Payload
```bash
npm run generate:types
```
**¿Qué hace?** Genera tipos TypeScript automáticamente basados en las colecciones de Payload.

### 2. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```

### 3. Verificar Accesos

#### Panel de Administración
- URL: `http://localhost:3000/admin`
- Crear un usuario administrador en el primer acceso

#### Frontend de la Aplicación
- URL: `http://localhost:3000`
- Verificar que la página principal carga correctamente

#### API de Payload
- URL: `http://localhost:3000/api`
- Verificar que las colecciones están disponibles

### 4. Pruebas de Integración
```bash
# Ejecutar pruebas
npm run test

# Solo pruebas de integración
npm run test:int

# Solo pruebas end-to-end
npm run test:e2e
```

---

## Solución de Problemas Comunes

### Error: "Cannot connect to MongoDB"
```bash
# Verificar que MongoDB está ejecutándose
mongodb://localhost:27017

# Para MongoDB Atlas, verificar la cadena de conexión
# Formato: mongodb+srv://usuario:password@cluster.mongodb.net/database
```

### Error: "S3 bucket not accessible"
```bash
# Verificar configuración S3
AWS_ACCESS_KEY_ID=tu_key
AWS_SECRET_ACCESS_KEY=tu_secret
S3_BUCKET=tu_bucket
S3_REGION=us-east-1
```

### Error: "Port 3000 already in use"
```bash
# Cambiar puerto en el comando dev
PORT=3001 npm run dev

# O matar el proceso que usa el puerto
lsof -ti:3000 | xargs kill -9
```

### Error: "Module not found"
```bash
# Limpiar caché y reinstalar
rm -rf node_modules package-lock.json
npm install

# O con pnpm
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Error de Tipos TypeScript
```bash
# Regenerar tipos de Payload
npm run generate:types

# Verificar configuración TypeScript
npx tsc --noEmit
```

---

## Comandos de Desarrollo Útiles

### Desarrollo
```bash
npm run dev          # Servidor de desarrollo
npm run devsafe      # Desarrollo con limpieza de caché
npm run build        # Compilar para producción
npm run start        # Servidor de producción
```

### Payload CMS
```bash
npm run generate:types    # Generar tipos TypeScript
npm run generate:importmap  # Generar mapa de importaciones
npm run payload            # CLI de Payload
```

### Testing
```bash
npm run test         # Todas las pruebas
npm run test:int     # Pruebas de integración
npm run test:e2e     # Pruebas end-to-end
npm run lint         # Verificar código
```

---

## Siguiente Paso

Una vez completada la instalación, continúa con:
- **[01-Architecture.md](./01-Architecture.md)**: Para entender la arquitectura del proyecto
- **[03-Auth-Step-by-Step.md](./03-Auth-Step-by-Step.md)**: Para implementar autenticación
- **[Slug-Factory-Guide.md](./Slug-Factory-Guide.md)**: Para crear URLs dinámicas

---

*Esta guía te proporciona una base sólida para comenzar con el desarrollo. Cada configuración ha sido optimizada para el flujo de desarrollo del proyecto Farmshop Finder.*