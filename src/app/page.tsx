'use client'

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
  Camera,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

import DashboardPage from '@/components/dashboard'
import OrganizationsPage from '@/components/organizations'
import EventsPage from '@/components/events'
import SessionsPage from '@/components/sessions'
import QueuePage from '@/components/queue'
import GalleryPage from '@/components/gallery'
import TemplatesPage from '@/components/templates'
import DevicesPage from '@/components/devices'
import AuditLogPage from '@/components/audit-log'

const navItems: { page: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'organizations', label: 'Organizations', icon: Building2 },
  { page: 'events', label: 'Events', icon: Calendar },
  { page: 'sessions', label: 'Sessions', icon: Users },
  { page: 'queue', label: 'Queue', icon: ListOrdered },
  { page: 'gallery', label: 'Gallery', icon: ImageIcon },
  { page: 'templates', label: 'Templates', icon: Palette },
  { page: 'devices', label: 'Devices', icon: Monitor },
  { page: 'audit', label: 'Audit Log', icon: ScrollText },
]

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

function AppSidebar() {
  const { currentPage, setCurrentPage } = useAppStore()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="CSOA Photobooth">
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Camera className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">CSOA</span>
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
  }

  const CurrentPageComponent = pages[currentPage]

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
        <ThemeToggle />
      </header>
      <div className="flex flex-1 flex-col">
        <div className="flex-1 p-4 md:p-6">
          <CurrentPageComponent />
        </div>
        <footer className="border-t py-4 px-4 md:px-6">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} CSOA Photobooth Management System. All rights reserved.
          </p>
        </footer>
      </div>
    </SidebarInset>
  )
}

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <PageContent />
    </SidebarProvider>
  )
}
