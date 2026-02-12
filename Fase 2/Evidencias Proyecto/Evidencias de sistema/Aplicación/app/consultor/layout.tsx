"use client"

import { Suspense } from "react"
import { useAuth } from "@/hooks/auth"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import DashboardLayout from "../dashboard-layout"
import { Loader2 } from "lucide-react"

function ConsultorLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Permitir a admin ver una solicitud en solo lectura (botón ojo en tabla admin)
  const isAdminViewOnly =
    user?.role === "admin" &&
    pathname?.match(/\/consultor\/proceso\/\d+/) &&
    searchParams.get("viewOnly") === "1"

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login")
      } else if (user.role !== "consultor" && !isAdminViewOnly) {
        router.push("/admin/solicitudes")
      }
    }
  }, [user, isLoading, router, isAdminViewOnly])

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

  if (!user || (user.role !== "consultor" && !isAdminViewOnly)) {
    return null
  }

  return <DashboardLayout>{children}</DashboardLayout>
}

export default function ConsultorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      }
    >
      <ConsultorLayoutInner>{children}</ConsultorLayoutInner>
    </Suspense>
  )
}
