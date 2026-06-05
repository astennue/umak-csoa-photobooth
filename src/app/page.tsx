'use client'

import { useSession, signOut } from 'next-auth/react'
import { useAppStore, type Page } from '@/lib/store'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  ListOrdered,
  ImageIcon,
  Palette,
  Monitor,
  ScrollText,
  Moon,
  Sun,
  UserCog,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

import DashboardPage from '@/components/dashboard'
import OrganizationsPage from '@/components/organizations'
import EventsPage from '@/components/events'
import SessionsPage from '@/components/sessions'
import QueuePage from '@/components/queue'
import GalleryPage from '@/components/gallery'
import TemplatesPage from '@/components/templates'
import DevicesPage from '@/components/devices'
import AuditLogPage from '@/components/audit-log'
import UsersPage from '@/components/users'
import LoginPage from '@/components/login-page'

function getNavItems(role?: string): { page: Page; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] {
  const items = [
    { page: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { page: 'organizations' as Page, label: 'Organizations', icon: Building2 },
    { page: 'events' as Page, label: 'Events', icon: Calendar },
    { page: 'sessions' as Page, label: 'Sessions', icon: Users },
    { page: 'queue' as Page, label: 'Queue', icon: ListOrdered },
    { page: 'gallery' as Page, label: 'Gallery', icon: ImageIcon },
    { page: 'templates' as Page, label: 'Templates', icon: Palette },
    { page: 'devices' as Page, label: 'Devices', icon: Monitor },
    { page: 'audit' as Page, label: 'Audit Log', icon: ScrollText },
    { page: 'users' as Page, label: 'Users', icon: UserCog, adminOnly: true },
  ]

  if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN') {
    return items
  }
  return items.filter((item) => !item.adminOnly)
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
    case 'ORG_ADMIN':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
    case 'FACILITATOR':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin'
    case 'ORG_ADMIN':
      return 'Org Admin'
    case 'FACILITATOR':
      return 'Facilitator'
    default:
      return role
  }
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

function SidebarThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <SidebarMenuButton
      tooltip="Toggle Theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span>Toggle Theme</span>
    </SidebarMenuButton>
  )
}

function UserMenu() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const name = session?.user?.name || 'User'
  const email = session?.user?.email || ''
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start text-left">
            <span className="text-xs font-medium leading-none">{name}</span>
            {role && (
              <Badge variant="outline" className={`mt-0.5 text-[10px] px-1 py-0 h-4 ${getRoleBadgeColor(role)}`}>
                {getRoleLabel(role)}
              </Badge>
            )}
          </div>
          <ChevronDown className="size-3 text-muted-foreground hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
            {role && (
              <Badge variant="outline" className={`w-fit text-[10px] mt-1 ${getRoleBadgeColor(role)}`}>
                {getRoleLabel(role)}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="text-red-600 dark:text-red-400 cursor-pointer">
          <LogOut className="size-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AppSidebar() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const { currentPage, setCurrentPage } = useAppStore()
  const navItems = getNavItems(role)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="UMak CSOA">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-white">
                <Image
                  src="/umak-csoa-logo.png"
                  alt="UMak CSOA"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">UMak CSOA</span>
                <span className="truncate text-xs">Photobooth Manager</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={currentPage === item.page}
                    onClick={() => setCurrentPage(item.page)}
                    tooltip={item.label}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function PageContent() {
  const { currentPage } = useAppStore()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const navItems = getNavItems(role)

  const pages: Record<Page, React.ComponentType> = {
    dashboard: DashboardPage,
    organizations: OrganizationsPage,
    events: EventsPage,
    sessions: SessionsPage,
    queue: QueuePage,
    gallery: GalleryPage,
    templates: TemplatesPage,
    devices: DevicesPage,
    audit: AuditLogPage,
    users: UsersPage,
  }

  const CurrentPageComponent = pages[currentPage] ?? DashboardPage

  return (
    <SidebarInset>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <div className="flex-1">
          <h2 className="text-sm font-medium">
            {navItems.find((item) => item.page === currentPage)?.label ?? currentPage}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <div className="flex flex-1 flex-col">
        <div className="flex-1 p-4 md:p-6">
          <CurrentPageComponent />
        </div>
        <footer className="border-t py-4 px-4 md:px-6">
          <p className="text-xs text-muted-foreground text-center">
            © 2026 UMak CSOA - Center for Student Organization and Activities. University of Makati.
          </p>
        </footer>
      </div>
    </SidebarInset>
  )
}

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white shadow-lg p-1">
            <Image
              src="/umak-csoa-logo.png"
              alt="UMak CSOA"
              fill
              className="object-contain p-1"
            />
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <PageContent />
    </SidebarProvider>
  )
}
