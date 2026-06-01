"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { getCandidatesByProcess } from "@/lib/api"

type ProcessViewContextType = {
  isViewOnly: boolean
  sharedCandidates: any[] | null
  setSharedCandidates: (candidates: any[] | null) => void
  ensureCandidates: (processId: string) => Promise<any[]>
}

const ProcessViewContext = createContext<ProcessViewContextType | null>(null)

export function ProcessViewProvider({
  children,
  isViewOnly,
}: {
  children: ReactNode
  isViewOnly: boolean
}) {
  const [sharedCandidates, setSharedCandidates] = useState<any[] | null>(null)

  const ensureCandidates = useCallback(
    async (processId: string) => {
      if (sharedCandidates) return sharedCandidates
      const data = await getCandidatesByProcess(processId)
      setSharedCandidates(data)
      return data
    },
    [sharedCandidates]
  )

  return (
    <ProcessViewContext.Provider
      value={{ isViewOnly, sharedCandidates, setSharedCandidates, ensureCandidates }}
    >
      {children}
    </ProcessViewContext.Provider>
  )
}

export function useProcessView() {
  return useContext(ProcessViewContext)
}

/** Admin viewOnly o cliente viewOnly (no incluye modo coordinador). */
export function isProcessViewOnly(readOnly?: boolean, clientViewOnly?: boolean) {
  return Boolean(readOnly || clientViewOnly)
}
