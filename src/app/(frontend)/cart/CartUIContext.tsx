'use client'

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'

interface CartUIContextValue {
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const CartUIContext = createContext<CartUIContextValue | undefined>(undefined)

export function CartUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const lastFocused = useRef<HTMLElement | null>(null)

  const openCart = useCallback(() => {
    lastFocused.current = document.activeElement as HTMLElement | null
    setIsOpen(true)
  }, [])
  const closeCart = useCallback(() => {
    setIsOpen(false)
  }, [])
  const toggleCart = useCallback(() => {
    setIsOpen((o) => !o)
  }, [])

  // body scroll lock
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isOpen])

  // return focus
  useEffect(() => {
    if (!isOpen && lastFocused.current) {
      lastFocused.current.focus()
    }
  }, [isOpen])

  const value: CartUIContextValue = {
    isOpen,
    openCart,
    closeCart,
    toggleCart,
    triggerRef,
  }

  return <CartUIContext.Provider value={value}>{children}</CartUIContext.Provider>
}

export function useCartUI() {
  const ctx = useContext(CartUIContext)
  if (!ctx) throw new Error('useCartUI must be used within CartUIProvider')
  return ctx
}
