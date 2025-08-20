import { RichTextBlockType } from '@/payload-types'
import { RichText as RichTextModule } from '@/module/richText'

export const RichText = ({ content }: RichTextBlockType) => {
  return (
    <div className="w-10/12 md:w-9/12 richTextSt flex flex-col text-[var(--carrot)] items-center justify-center">
      <RichTextModule data={content} />
    </div>
  )
}
