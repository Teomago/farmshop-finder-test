'use client'

import React, { useState, useTransition } from 'react'
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from '@heroui/navbar'
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/dropdown'
import { Link } from '@heroui/link'
import { Button } from '@heroui/button'
import Image from 'next/image'
import { User } from '@heroui/user'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { logout } from '../login/actions/logout'
import {
  ChevronDown,
  Scale,
  Lock,
  Activity,
  Flash,
  Server,
  TagUser,
  CartIcon,
} from '../icons/icons'
import { useAllCarts, useCartTotals, useDecrementItem, useClearCarts } from '../cart/hooks/useCarts'

export default function NavbarCP({
  title,
  logoUrl,
  logoAlt,
  navItems,
}: {
  title: string
  logoUrl: string
  logoAlt: string
  navItems: Array<{ id: string; label: string; link: string }>
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { carts } = useAllCarts()
  const { total, itemCount } = useCartTotals()
  const { mutate: decItem, isPending: decPending } = useDecrementItem()
  const { mutate: clearCarts, isPending: clearPending } = useClearCarts()

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
      queryClient.invalidateQueries({ queryKey: ['user'] })
      router.push('/login')
      router.refresh()
    })
  }

  const icons = {
    chevron: <ChevronDown fill="currentColor" size={16} height={16} width={16} />,
    scale: <Scale className="text-warning" fill="currentColor" size={30} height={30} width={30} />,
    lock: <Lock className="text-success" fill="currentColor" size={30} height={30} width={30} />,
    activity: (
      <Activity className="text-secondary" fill="currentColor" size={30} height={30} width={30} />
    ),
    flash: <Flash className="text-primary" fill="currentColor" size={30} height={30} width={30} />,
    server: (
      <Server className="text-success" fill="currentColor" size={30} height={30} width={30} />
    ),
    user: <TagUser className="text-danger" fill="currentColor" size={30} height={30} width={30} />,
  }

  // Mobile menu should always reflect the navItems coming from the Header (admin configurable)

  return (
    <Navbar onMenuOpenChange={setIsMenuOpen} className="bg-[var(--carrot)]/90">
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className="sm:hidden"
        />
        <NavbarBrand>
          {/**Logo de la página */}
          <Image src={logoUrl} color="white" alt={logoAlt} width={50} height={50} />
          {/**Nombre de la página */}
          <p className="hidden md:block font-bold text-inherit">{title}</p>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <Dropdown className="bg-[var(--carrot)]/90">
          <NavbarItem>
            <DropdownTrigger>
              <Button
                disableRipple
                className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                endContent={icons.chevron}
                radius="sm"
                variant="light"
              >
                Features
              </Button>
            </DropdownTrigger>
          </NavbarItem>
          <DropdownMenu
            aria-label="Farm Features"
            itemClasses={{
              base: 'gap-4',
            }}
          >
            <DropdownItem
              key="autoscaling"
              description="Farm grows with your needs"
              startContent={icons.scale}
            >
              Autoscaling
            </DropdownItem>
            <DropdownItem
              key="usage_metrics"
              description="Real-time metrics to debug issues"
              startContent={icons.activity}
            >
              Usage Metrics
            </DropdownItem>
            <DropdownItem
              key="production_ready"
              description="Attention to detail and quality"
              startContent={icons.flash}
            >
              Production Ready
            </DropdownItem>
            <DropdownItem
              key="99_uptime"
              description="If it’s not running, we’re not happy"
              startContent={icons.server}
            >
              +99% Uptime
            </DropdownItem>
            <DropdownItem
              key="supreme_support"
              description="We’re here to help you"
              startContent={icons.user}
            >
              +Supreme Support
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        {navItems.map((item) => (
          <NavbarItem key={item.id}>
            <Link href={item.link} className="text-white">
              {item.label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        {user && user.collection === 'users' && user.role === 'customer' ? (
          <Dropdown placement="bottom-end" className="bg-[var(--carrot)]/95 min-w-[320px]">
            <DropdownTrigger>
              <Button
                variant="light"
                className="relative overflow-visible text-white pr-6 bg-[var(--barn)]/85 shadow-2xl"
                startContent={<CartIcon className="text-white" />}
              >
                Cart
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 translate-x-1/3 -translate-y-1/3 bg-red-600 text-white text-[10px] px-1 rounded-full shadow-md pointer-events-none">
                    {itemCount}
                  </span>
                )}
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Cart" className="max-h-[400px] overflow-y-auto">
              {carts.length === 0 ? (
                <DropdownItem key="empty" className="opacity-70 text-sm">
                  Your cart is empty
                </DropdownItem>
              ) : (
                [
                  ...carts.flatMap((cart) => {
                    return [
                      <DropdownItem
                        key={cart.id + '-header'}
                        textValue={cart.farmName}
                        className="py-1 bg-white/5"
                      >
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{cart.farmName}</span>
                          <span>€{cart.total.toFixed(2)}</span>
                        </div>
                      </DropdownItem>,
                      ...cart.lines.map((line) => (
                        <DropdownItem key={`${cart.id}-${line.id}`} className="py-1">
                          <div className="flex justify-between items-center gap-2 text-xs">
                            <div className="flex flex-col">
                              <span>
                                {line.productName}
                                {line.bundles > 1 && (
                                  <span className="ml-1 opacity-70 font-mono">x{line.bundles}</span>
                                )}
                              </span>
                              {line.bundleSize > 0 && (
                                <span className="opacity-60">
                                  ({line.bundleSize} {line.unit})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono">
                                €{(line.priceEach * line.bundles).toFixed(2)}
                              </span>
                              <button
                                type="button"
                                disabled={decPending}
                                onClick={(e) => {
                                  e.preventDefault()
                                  decItem({
                                    cartId: cart.id,
                                    productId: line.productId,
                                    amount: 1,
                                  })
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] disabled:opacity-50"
                              >
                                -
                              </button>
                            </div>
                          </div>
                        </DropdownItem>
                      )),
                    ]
                  }),
                  <DropdownItem key="grand-total" className="bg-white/10 mt-1">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Grand Total</span>
                      <span>€{total.toFixed(2)}</span>
                    </div>
                  </DropdownItem>,
                  <DropdownItem key="clear-all" className="pt-1">
                    <div className="flex">
                      <button
                        type="button"
                        className="w-full bg-red-700 hover:bg-red-600 text-white text-xs py-1 rounded disabled:opacity-50"
                        disabled={clearPending}
                        onClick={(e) => {
                          e.preventDefault()
                          clearCarts()
                        }}
                      >
                        {clearPending ? 'Clearing...' : 'Clear All'}
                      </button>
                    </div>
                  </DropdownItem>,
                ]
              )}
            </DropdownMenu>
          </Dropdown>
        ) : null}
        {user && user.collection === 'users' ? (
          <Dropdown placement="bottom-end" className="bg-[var(--carrot)]/90">
            <DropdownTrigger>
              <User
                as="button"
                avatarProps={{
                  isBordered: true,
                  src: '/api/media/file/teo_avatar.png',
                }}
                className="transition-transform mt-1"
                description={user.email || ''}
                name={user.name || user.email}
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="User Actions" variant="flat">
              <DropdownItem key="profile" className="h-14 gap-2">
                <p className="font-bold">Signed in as</p>
                <p className="font-bold">{user.name || user.email}</p>
              </DropdownItem>
              <DropdownItem key="admin" href="/dashboard">
                Dashboard
              </DropdownItem>
              <DropdownItem
                key="logout"
                color="danger"
                onClick={handleLogout}
                className={isPending ? 'opacity-60' : ''}
              >
                {isPending ? 'Logging out...' : 'Log Out'}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        ) : (
          <>
            <NavbarItem>
              <Button
                onPress={(_e) => {
                  router.push('/signup')
                  router.refresh()
                }}
                className="text-white bg-transparent"
                href="/signup"
              >
                Sign Up
              </Button>
            </NavbarItem>
            <NavbarItem>
              <Button
                as={Link}
                className="text-white bg-transparent border border-white"
                href="/login"
              >
                Login
              </Button>
            </NavbarItem>
          </>
        )}
      </NavbarContent>
      <NavbarMenu className="bg-[var(--carrot)]/90">
        {navItems.map((item) => (
          <NavbarMenuItem key={item.id}>
            <Link className="w-full text-white" href={item.link} size="lg">
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </Navbar>
  )
}
