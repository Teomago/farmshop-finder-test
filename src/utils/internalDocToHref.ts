import { Farm } from '@/payload-types'
import { SerializedLinkNode } from '@payloadcms/richtext-lexical'

export const internalDocToHref = ({
  linkNode,
}: {
  linkNode: SerializedLinkNode | { relationTo: string; value: any }
}): string => {
  const relationTo = 'fields' in linkNode ? linkNode.fields?.doc?.relationTo : linkNode.relationTo
  const value = 'fields' in linkNode ? linkNode.fields?.doc?.value : linkNode.value

  if (!value || typeof value !== 'object') return '/'

  switch (relationTo) {
    case 'pages':
      return `${value?.pathname}`
    case 'farms':
      const farm = value as Farm
      return `/farms/${farm.slug || farm.id}`
    case 'products':
      return `/products/${value.id}`
    default:
      return '/'
  }
}
