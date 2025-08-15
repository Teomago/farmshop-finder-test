import { CoverBlockType } from '@/payload-types'

export const Cover = ({ title, subtitle }: CoverBlockType) => {
  return (
    <>
      <div className="flex flex-col items-center justify-center h-[10em] text-[var] bg-cover bg-center">
        <h1>{title}</h1>
        <h3>{subtitle}</h3>
      </div>
    </>
  )
}
