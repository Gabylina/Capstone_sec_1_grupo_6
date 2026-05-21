"use client"

import { useAuth } from "@/hooks/auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import DashboardLayout from "../dashboard-layout"
import { Loader2 } from "lucide-react"

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) router.push("/login")
      else if (user.role !== "cliente") {
        if (user.role === "admin") router.push("/admin/solicitudes")
        else router.push("/consultor")
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || user.role !== "cliente") return null

  return <DashboardLayout>{children}</DashboardLayout>
}
