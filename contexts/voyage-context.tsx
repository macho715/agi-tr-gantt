"use client"

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import type { Voyage, VoyageId, DocInstance } from "@/lib/types"

interface VoyageContextValue {
  voyages: Voyage[]
  selectedVoyageId: VoyageId | null
  setSelectedVoyageId: (id: VoyageId) => void
  getVoyageTasks: (id: VoyageId) => { taskIds: string[]; dateRange?: { start: string; end: string } }
  docsByVoyage: Record<VoyageId, DocInstance[]>
  updateDoc: (voyageId: VoyageId, templateId: string, patch: Partial<DocInstance>) => void
}

const VoyageContext = createContext<VoyageContextValue | null>(null)

export function VoyageProvider({
  children,
  voyages: initialVoyages,
}: {
  children: React.ReactNode
  voyages: Voyage[]
}) {
  const [voyages, setVoyages] = useState<Voyage[]>(initialVoyages)
  const [selectedVoyageId, setSelectedVoyageId] = useState<VoyageId | null>(null)

  useEffect(() => {
    setVoyages(initialVoyages)
  }, [initialVoyages])
  const [docsByVoyage, setDocsByVoyage] = useState<Record<VoyageId, DocInstance[]>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("voyage-docs")
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return {}
        }
      }
    }
    return {}
  })

  const getVoyageTasks = useCallback(
    (id: VoyageId) => {
      const voyage = voyages.find((v) => v.id === id)
      if (!voyage) return { taskIds: [] }

      const dateRange =
        voyage.milestones.mzp_arrival && voyage.milestones.agi_arrival
          ? {
              start: voyage.milestones.mzp_arrival,
              end: voyage.milestones.agi_arrival,
            }
          : undefined

      return { taskIds: [], dateRange }
    },
    [voyages],
  )

  useEffect(() => {
    if (!selectedVoyageId && voyages.length > 0) {
      setSelectedVoyageId(voyages[0].id)
    }
  }, [selectedVoyageId, voyages])

  const updateDoc = useCallback((voyageId: VoyageId, templateId: string, patch: Partial<DocInstance>) => {
    setDocsByVoyage((prev) => {
      const voyageDocs = prev[voyageId] || []
      const existingIndex = voyageDocs.findIndex((d) => d.templateId === templateId)
      const updated = { ...prev }

      if (existingIndex >= 0) {
        updated[voyageId] = voyageDocs.map((d, i) => (i === existingIndex ? { ...d, ...patch } : d))
      } else {
        updated[voyageId] = [
          ...voyageDocs,
          {
            templateId,
            voyageId,
            workflowState: "not_started",
            dueAt: "",
            attachments: [],
            history: [],
            ...patch,
          } as DocInstance,
        ]
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("voyage-docs", JSON.stringify(updated))
      }

      return updated
    })
  }, [])

  const value = useMemo(
    () => ({
      voyages,
      selectedVoyageId,
      setSelectedVoyageId,
      getVoyageTasks,
      docsByVoyage,
      updateDoc,
    }),
    [voyages, selectedVoyageId, getVoyageTasks, docsByVoyage, updateDoc],
  )

  return <VoyageContext.Provider value={value}>{children}</VoyageContext.Provider>
}

export function useVoyageContext() {
  const context = useContext(VoyageContext)
  if (!context) {
    throw new Error("useVoyageContext must be used within VoyageProvider")
  }
  return context
}
