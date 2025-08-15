import { DefaultNodeTypes } from '@payloadcms/richtext-lexical'
import { type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import { LinkJSXConverter } from '@/module/richText/converters/LinkJSXConverter'
import { internalDocToHref } from '@/utils/internalDocToHref'

type NodeTypes = DefaultNodeTypes

export const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
})
