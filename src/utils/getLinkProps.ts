import { internalDocToHref } from './internalDocToHref'
import { Page } from '@/payload-types'

interface LinkProps {
  type?: ('reference' | 'custom') | null | undefined
  newTab?: boolean | null
  reference?: {
    relationTo: 'pages'
    value: string | Page
  } | null
  url?: string | null
  label?: string
}

interface ReturnLinkProps {
  href: string
  target?: '_blank'
  rel?: 'noopener noreferrer'
}

export const getLinkProps = (link: LinkProps): ReturnLinkProps => {
  let url = '/'

  if (link.type === 'custom' && link?.url) {
    url = link.url
  } else if (link?.type === 'reference' && link?.reference) {
    url = internalDocToHref({ linkNode: link.reference })
  }

  const props: ReturnLinkProps = {
    href: url,
  }

  if (link.newTab) {
    props.target = '_blank'
    props.rel = 'noopener noreferrer'
  }

  return props
}
