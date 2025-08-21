import { Farm, Page, Product } from '@/payload-types'
import { SerializedLinkNode } from '@payloadcms/richtext-lexical'

export const internalDocToHref = ({
  linkNode,
}: {
  linkNode: SerializedLinkNode | { relationTo: string; value: string | Page | Farm | Product }
}): string => {
  const relationTo = 'fields' in linkNode ? linkNode.fields?.doc?.relationTo : linkNode.relationTo
  const value = 'fields' in linkNode ? linkNode.fields?.doc?.value : linkNode.value

  if (!value || typeof value !== 'object') return '/'

  switch (relationTo) {
    case 'pages':
      const page = value as Page
      return `${page?.pathname || '/'}`
    case 'farms':
      const farm = value as Farm
      return `/farms/${farm.slug || farm.id}`
    case 'products':
      const product = value as Product
      return `/products/${product.id}`
    default:
      return '/'
  }
}
