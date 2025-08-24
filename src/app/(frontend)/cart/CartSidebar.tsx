'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAllCarts, useCartTotals, useDecrementItem, useClearCarts } from './hooks/useCarts'
import { Forward, CloseSquare } from '../icons/icons'

export function CartSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { carts, isLoading } = useAllCarts()
  const { total } = useCartTotals()
  const { mutate: decItem, isPending: decPending } = useDecrementItem()
  const { mutate: clearCarts, isPending: clearPending } = useClearCarts()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // close on ESC
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // focus management (simple: focus panel when open)
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus()
    }
  }, [open])

  const onBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )
  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[9998] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onMouseDown={onBackdropClick}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 h-full w-[min(420px,95vw)] bg-[var(--carrot)] shadow-xl z-[9999] transform transition-transform duration-300 ease-out flex flex-col border-l border-black/10 dark:border-white/10 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
          <h2 className="text-lg font-semibold text-white!">Your Cart</h2>
          <button
            aria-label="Close cart"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full transition"
          >
            <Forward className="hover:rotate-180 text-white transition" size={30} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-sm">
          {isLoading ? (
            <p className="opacity-70">Loading...</p>
          ) : carts.length === 0 ? (
            <p className="opacity-70">Your cart is empty</p>
          ) : (
            carts.map((cart) => (
              <div
                key={cart.id}
                className="border border-black/10 dark:border-white/10 rounded p-3"
              >
                <div className="flex justify-between mb-2 text-xs font-semibold">
                  <span>{cart.farmName}</span>
                  <span>€{cart.total.toFixed(2)}</span>
                </div>
                <ul className="space-y-2">
                  {cart.lines.map((line) => (
                    <li key={line.id} className="flex justify-between items-center gap-2">
                      <div className="flex flex-col">
                        <span>
                          {line.productName}
                          {line.bundles > 1 && (
                            <span className="ml-1 opacity-70 font-mono">x{line.bundles}</span>
                          )}
                        </span>
                        {line.bundleSize > 0 && (
                          <span className="opacity-60 text-[11px]">
                            ({line.bundleSize} {line.unit})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono">
                          €{(line.priceEach * line.bundles).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          disabled={decPending}
                          onClick={() =>
                            decItem({ cartId: cart.id, productId: line.productId, amount: 1 })
                          }
                          className="w-6 h-6 flex items-center justify-center rounded text-white disabled:opacity-50"
                          aria-label="Remove one"
                        >
                          <CloseSquare
                            size={18}
                            className="text-red-600 hover:text-red-700 hover:scale-130 transition"
                          />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-black/10 dark:border-white/10 p-4 space-y-3">
          <div className="flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span>€{total.toFixed(2)}</span>
          </div>
          <button
            type="button"
            disabled={clearPending || carts.length === 0}
            onClick={() => clearCarts()}
            className="w-full bg-red-700 hover:bg-red-600 text-white text-xs py-2 rounded disabled:opacity-50"
          >
            {clearPending ? 'Clearing...' : 'Clear All'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
