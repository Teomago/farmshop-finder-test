// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { s3Storage } from '@payloadcms/storage-s3'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import brevoAdapter from './utils/brevoAdapter'
import { Pages } from './collections/Pages'
import { Header } from './globals/Header'
import { Footer } from './globals/Footer'
import { Home } from './collections/Home'
import { HomeConfig } from './globals/HomeConfig'
import { Products } from './collections/Products'
import { Farms } from './collections/Farms'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  globals: [Header, Footer, HomeConfig],
  collections: [Users, Media, Pages, Products, Farms, Home],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    s3Storage({
      collections: {
        media: {
          prefix: 'media',
        },
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION || '',
        endpoint: process.env.S3_ENDPOINT || '',
        forcePathStyle: true, // Required for some S3-compatible services
      },
    }),
    nestedDocsPlugin({
      collections: ['pages'],
      generateLabel: (_, doc) => doc?.name as string,
      //Do not change the `.replace` below. It ensures that "/" is allowed for the slug, with breadcrumbs
      generateURL: (docs) =>
        docs.reduce((url, doc) => `${url}/${doc.slug}`.replace(/^\/+/, '/'), ''),
    }),
  ],
  email: brevoAdapter(),
})
