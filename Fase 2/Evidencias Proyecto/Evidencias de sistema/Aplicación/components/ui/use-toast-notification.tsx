"use client"

import { useToast } from "@/hooks/use-toast"

type ToastVariant = "default" | "destructive"

interface ShowToastParams {
  type: "success" | "error" | "warning" | "info"
  title?: string
  description: string
}

export function useToastNotification() {
  const { toast } = useToast()

  const showToast = ({ type, title, description }: ShowToastParams) => {
    let variant: ToastVariant = "default"
    let defaultTitle = ""

    switch (type) {
      case "success":
        variant = "default" // Azul (primary) - texto blanco con fondo azul
        defaultTitle = "¡Éxito!"
        break
      case "error":
        variant = "destructive" // Rojo
        defaultTitle = "Error"
        break
      case "warning":
        variant = "destructive" // Rojo
        defaultTitle = "Advertencia"
        break
      case "info":
        variant = "default" // Azul (primary)
        defaultTitle = "Información"
        break
    }

    toast({
      title: title || defaultTitle,
      description,
      variant,
    })
  }

  return { showToast }
}

