'use client'

import React, { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { register } from '../actions/register'
import { Form } from '@heroui/form'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Select, SelectItem } from '@heroui/select'

export const SignupForm = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') || '').toString().trim()
    const email = (fd.get('email') || '').toString().trim().toLowerCase()
    const password = (fd.get('password') || '').toString()
    const role = (fd.get('role') || 'customer').toString() as 'farmer' | 'customer'

    const res = await register({ name, email, password, role })
    setIsPending(false)
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      router.push('/dashboard')
      router.refresh()
    } else {
      setError(res.error || 'Signup failed')
    }
  }

  return (
    <Form
      className="w-2xs p-8 max-w-sm flex flex-col gap-4 bg-[var(--carrot)]/90 rounded-2xl"
      onSubmit={handleSubmit}
    >
      <Input label="Name" name="name" isRequired labelPlacement="outside" placeholder="Your name" />
      <Input
        label="Email"
        name="email"
        type="email"
        isRequired
        labelPlacement="outside"
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        isRequired
        labelPlacement="outside"
        placeholder="••••••"
      />
      <Select
        name="role"
        label="Role"
        labelPlacement="outside"
        defaultSelectedKeys={['customer']}
        isRequired
      >
        {/* HeroUI SelectItem uses key + textValue */}
        <SelectItem key="customer" textValue="customer">
          Customer
        </SelectItem>
        <SelectItem key="farmer" textValue="farmer">
          Farmer
        </SelectItem>
      </Select>
      <div className="flex gap-2">
        <Button color="primary" type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Sign Up'}
        </Button>
        <Button type="reset" variant="flat" disabled={isPending}>
          Reset
        </Button>
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
    </Form>
  )
}
