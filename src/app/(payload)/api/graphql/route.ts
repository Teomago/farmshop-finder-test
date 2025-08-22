/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes'
import { NextRequest } from 'next/server'

export const POST = GRAPHQL_POST(config)

// Type-safe wrapper to handle parameter mismatch
export const OPTIONS = (request: NextRequest, context: { params: Promise<Record<string, unknown>> }) => {
  // Convert context to expected format for REST_OPTIONS
  const convertedContext = {
    params: context.params as Promise<{ slug: string[] }>
  }
  return REST_OPTIONS(config)(request, convertedContext)
}
