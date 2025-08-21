import React from 'react'
import { SignupForm } from './components/SignupForm'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  return (
    <div className="flex flex-col justify-center items-center h-[calc(100vh-15.5em)]">
      <SignupForm />
    </div>
  )
}
