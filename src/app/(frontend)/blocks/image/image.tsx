import { ImageBlockType } from '@/payload-types'
import { Image as HeroUiImage } from '@heroui/image'

export const Image = ({ image }: ImageBlockType) => {
  return (
    <>
      <div className="richTextSt w-10/12 md:w-9/12 flex flex-col items-center justify-center my-4">
        <HeroUiImage
          isBlurred
          src={typeof image === 'object' && image !== null ? (image.url ?? '') : ''}
          alt={typeof image === 'object' && image !== null ? image.alt || 'Image' : 'Image'}
          className="w-[1000px] h-[350px] object-cover"
        />
      </div>
    </>
  )
}
