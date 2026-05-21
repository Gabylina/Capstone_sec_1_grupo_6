"use client"

import { useAuth } from "@/hooks/auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect based on user role directly to specific pages
        if (user.role === "admin") {
          router.push("/admin/solicitudes")
        } else if (user.role === "cliente") {
          router.push("/cliente")
        } else {
          router.push("/consultor")
        }
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src="/images/llconsulting-logo.png" 
              alt="LLConsulting" 
              className="h-40 w-auto max-w-[500px] object-contain" 
            />
          </div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return null
}
