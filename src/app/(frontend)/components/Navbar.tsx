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
import type { User as PayloadUser } from '@/payload-types'
import { logout } from '../login/actions/logout'

import { ChevronDown, Scale, Lock, Activity, Flash, Server, TagUser } from '../icons/icons'

export default function NavbarCP({
  title,
  logoUrl,
  logoAlt,
  navItems,
  user,
}: {
  title: string
  logoUrl: string
  logoAlt: string
  navItems: Array<{ id: string; label: string; link: string }>
  user: PayloadUser | null
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<PayloadUser | null>(user)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
      setCurrentUser(null)
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

  const menuItems = [
    'Profile',
    'Dashboard',
    'Activity',
    'Analytics',
    'System',
    'Deployments',
    'My Settings',
    'Team Settings',
    'Help & Feedback',
    'Log Out',
  ]

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
        {currentUser ? (
          <NavbarItem>
            <Dropdown>
              <DropdownTrigger>
                <User
                  as="button"
                  avatarProps={{
                    isBordered: true,
                    src: '/api/media/file/teo_avatar.png',
                  }}
                  className="transition-transform mt-1"
                  description={currentUser.email || ''}
                  name={currentUser.name || currentUser.email}
                />
              </DropdownTrigger>
              <DropdownMenu aria-label="User Actions" variant="flat">
                <DropdownItem key="profile" className="h-14 gap-2">
                  <p className="font-bold">Signed in as</p>
                  <p className="font-bold">{currentUser.name || currentUser.email}</p>
                </DropdownItem>
                <DropdownItem key="admin" href="/dashboard">
                  My Settings
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
          </NavbarItem>
        ) : (
          <NavbarItem>
            <Button
              onClick={() => router.push('/login')}
              className="text-white bg-transparent border border-white"
            >
              Login
            </Button>
          </NavbarItem>
        )}
      </NavbarContent>
      <NavbarMenu>
        {navItems.map((item, index) => (
          <NavbarMenuItem key={`${item}-${index}`}>
            <Link
              className="w-full"
              color={
                index === 1 ? 'primary' : index === menuItems.length - 1 ? 'danger' : 'foreground'
              }
              href={item.link}
              size="lg"
            >
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </Navbar>
  )
}
