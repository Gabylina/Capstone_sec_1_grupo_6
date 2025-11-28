"use client"

import { useAuth } from "@/hooks/auth"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { FileText, BarChart3, History, Bell, User, LogOut, Briefcase, Users, Building, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

const adminMenuItems = [
  {
    title: "Solicitudes",
    icon: FileText,
    href: "/admin/solicitudes",
  },
  {
    title: "Clientes",
    icon: Building,
    href: "/admin/clientes",
  },
  {
    title: "Usuarios",
    icon: Users,
    href: "/admin/usuarios",
  },
  {
    title: "Portales",
    icon: Globe,
    href: "/admin/portales",
  },
  {
    title: "Reportes",
    icon: BarChart3,
    href: "/admin/reportes",
  },
  {
    title: "Historial",
    icon: History,
    href: "/admin/historial",
  },
]

const consultorMenuItems = [
  {
    title: "Mis Procesos",
    icon: Briefcase,
    href: "/consultor",
  },
]

const commonMenuItems = [
  {
    title: "Alertas",
    icon: Bell,
    href: "/alertas",
  },
  {
    title: "Perfil",
    icon: User,
    href: "/perfil",
  },
]

export function AppSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const menuItems = user.role === "admin" ? adminMenuItems : consultorMenuItems

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-2">
          <img src="/images/llconsulting-logo.png" alt="LLConsulting" className="h-12 w-auto" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {commonMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              {`${user.firstName}`.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{`${user.firstName} ${user.lastName}`}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="w-full bg-transparent">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
