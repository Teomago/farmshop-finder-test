'use client'

import React, { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { login, LoginResponse } from '../actions/login'
import { Form } from '@heroui/form'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'

export default function LoginForm() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const result: LoginResponse = await login({ email, password })
    setIsPending(false)

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      router.push('/dashboard')
      router.refresh()
    } else {
      setError(result.error || 'Login failed, an error occurred')
    }
  }

  return (
    <Form
      className="w-2xs p-8 max-w-xs flex flex-col gap-4 bg-[var(--carrot)]/90 rounded-2xl"
      onSubmit={handleSubmit}
    >
      <Input
        isRequired
        errorMessage="Please enter a valid email"
        label="Email"
        labelPlacement="outside"
        name="email"
        placeholder="Enter your email"
        type="email"
      />

      <Input
        isRequired
        errorMessage="Please enter a valid password"
        label="Password"
        labelPlacement="outside"
        name="password"
        placeholder="Enter your password"
        type="password"
      />

      <div className="flex gap-2">
        <Button color="primary" type="submit" disabled={isPending}>
          {isPending ? 'Logging in...' : 'Login'}
        </Button>
        <Button type="reset" variant="flat">
          Reset
        </Button>
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}
    </Form>
  )
}
