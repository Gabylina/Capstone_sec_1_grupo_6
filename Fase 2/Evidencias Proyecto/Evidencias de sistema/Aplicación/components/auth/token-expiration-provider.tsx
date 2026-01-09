"use client"

import { TokenExpirationMonitor } from "./token-expiration-monitor"

/**
 * Provider que envuelve el monitor de expiración de token
 * Debe ser usado dentro de un componente cliente
 */
export function TokenExpirationProvider() {
  return <TokenExpirationMonitor />
}

