import { RichText as RichTextBase } from '@payloadcms/richtext-lexical/react'
import { jsxConverters } from './jsxConverters'
import { SerializedEditorState, SerializedLexicalNode } from '@payloadcms/richtext-lexical/lexical'

export interface RichTextProps {
  data: SerializedEditorState<SerializedLexicalNode> | undefined | null
}

export const RichText = ({ data }: RichTextProps) => {
  if (!data) return null
  return <RichTextBase converters={jsxConverters} data={data} disableContainer />
}
