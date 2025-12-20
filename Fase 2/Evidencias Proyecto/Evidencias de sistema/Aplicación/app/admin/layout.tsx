"use client"

import { useAuth } from "@/hooks/auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import DashboardLayout from "../dashboard-layout"
import { Loader2 } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // No está logueado, redirigir a login
        router.push("/login")
      } else if (user.role !== "admin") {
        // Es consultor intentando acceder a admin, redirigir a su área
        router.push("/consultor")
      }
    }
  }, [user, isLoading, router])

  // Mostrar loading mientras se verifica
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario o no es admin, no mostrar nada (se está redirigiendo)
  if (!user || user.role !== "admin") {
    return null
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
