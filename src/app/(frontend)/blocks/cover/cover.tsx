import { CoverBlockType } from '@/payload-types'

export const Cover = ({ title, subtitle }: CoverBlockType) => {
  return (
    <>
      <div className="flex flex-col items-center justify-center h-[10em] text-[var] bg-cover bg-center">
        <h1 className="text-[var(--orange)]">{title}</h1>
        <h3 className="text-[var(--carrot)]!">{subtitle}</h3>
      </div>
    </>
  )
}
