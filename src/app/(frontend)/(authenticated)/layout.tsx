import { redirect } from 'next/navigation'
import React, { FC, ReactNode } from 'react'
import { getUser } from './actions/getUser'

interface LayoutProps {
  children: ReactNode
}

const Layout: FC<LayoutProps> = async ({ children }) => {
  const user = await getUser()

  if (!user) {
    redirect('/login')
    return null
  }

  return (
    <>
      <div className="flex flex-col w-full min-h-[calc(100vh-15.5rem)] justify-center items-center">
        {children}
      </div>
    </>
  )
}

export default Layout
