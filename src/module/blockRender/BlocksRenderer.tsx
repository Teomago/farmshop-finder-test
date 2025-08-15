import React, { ComponentType } from 'react'
import { blockComponents } from '@/module/blockRender/blockComponents'
import { CoverBlockType } from '@/payload-types'

type Block = CoverBlockType

interface BlocksRendererProps {
  blocks: Block[] | null | undefined
}

export const BlocksRenderer = ({ blocks }: BlocksRendererProps) => {
  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return blocks.map((block, index) => {
      const { blockType } = block

      if (blockType && blockType in blockComponents) {
        const Block = blockComponents[blockType]
        const Component = Block as ComponentType<typeof block>

        if (Component) {
          return <Component key={index} {...block} />
        }
      }
      return <p key={index}>Unsupported block type: {blockType}</p>
    })
  }

  return null
}
