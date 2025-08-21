import React, { ReactElement } from 'react'

import LoginForm from './components/LoginForm'

// Force dynamic rendering to prevent build-time prerendering issues
export const dynamic = 'force-dynamic'

export default async function LoginPage(): Promise<ReactElement> {
  return (
    <div className="flex flex-col justify-center items-center h-[calc(100vh-15.5em)]">
      <LoginForm />
    </div>
  )
}
