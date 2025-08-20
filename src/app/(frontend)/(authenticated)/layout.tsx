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

  // Example: Conditional rendering based on user role
  //   if (user.role === 'farmer') {
  //     return (
  //       <div className="farmer-layout">
  //         <h1>Farmer Dashboard</h1>
  //         {children}
  //       </div>
  //     )
  //   } else if (user.role === 'customer') {
  //     return (
  //       <div className="customer-layout">
  //         <h1>Customer Dashboard</h1>
  //         {children}
  //       </div>
  //     )
  //   }

  return <>{children}</>
}

export default Layout
