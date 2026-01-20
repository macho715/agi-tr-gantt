'use client'

import * as React from 'react'

export type TideFocusSource =
  | {
      type: 'task'
      taskId?: string
      taskName?: string
    }
  | {
      type: 'manual'
    }
  | {
      type: 'unknown'
    }

type TideFocusState = {
  /** YYYY-MM-DD */
  focusedDate: string | null
  /**
   * Increments whenever we want the Water Tide panel to grab focus.
   * Useful to trigger focus effects even if the date stays the same.
   */
  focusNonce: number
  source: TideFocusSource | null
}

type FocusOptions = {
  /** default: true */
  scrollToPanel?: boolean
  /** default: true */
  requestInputFocus?: boolean
}

export type TideFocusContextValue = TideFocusState & {
  /**
   * Set the focused date and (optionally) request the Water Tide panel to scroll+focus.
   */
  focusDate: (dateIso: string, source?: TideFocusSource, options?: FocusOptions) => void

  /**
   * Update the focused date without incrementing focusNonce.
   * Use this for manual date changes inside the panel.
   */
  setDateSilently: (dateIso: string) => void

  clear: () => void
}

const TideFocusContext = React.createContext<TideFocusContextValue | null>(null)

function normalizeIsoDate(input: string) {
  // Accept `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss...`
  return input.trim().slice(0, 10)
}

function scrollToPanel() {
  const el = document.getElementById('water-tide-panel')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function TideFocusProvider({
  children,
  initialDate,
}: {
  children: React.ReactNode
  initialDate?: string
}) {
  const [state, setState] = React.useState<TideFocusState>({
    focusedDate: initialDate ? normalizeIsoDate(initialDate) : null,
    focusNonce: 0,
    source: null,
  })

  const focusDate = React.useCallback(
    (dateIso: string, source: TideFocusSource = { type: 'unknown' }, options?: FocusOptions) => {
      const normalized = normalizeIsoDate(dateIso)
      const shouldFocus = options?.requestInputFocus !== false

      setState((prev) => ({
        focusedDate: normalized,
        focusNonce: shouldFocus ? prev.focusNonce + 1 : prev.focusNonce,
        source,
      }))

      const shouldScroll = options?.scrollToPanel !== false
      if (shouldScroll) {
        // Next paint: ensure the panel exists & layout is settled.
        requestAnimationFrame(scrollToPanel)
      }
    },
    []
  )

  const setDateSilently = React.useCallback((dateIso: string) => {
    const normalized = normalizeIsoDate(dateIso)
    setState((prev) => ({
      ...prev,
      focusedDate: normalized,
      source: { type: 'manual' },
    }))
  }, [])

  const clear = React.useCallback(() => {
    setState({ focusedDate: null, focusNonce: 0, source: null })
  }, [])

  const value = React.useMemo<TideFocusContextValue>(
    () => ({
      ...state,
      focusDate,
      setDateSilently,
      clear,
    }),
    [state, focusDate, setDateSilently, clear]
  )

  return <TideFocusContext.Provider value={value}>{children}</TideFocusContext.Provider>
}

export function useTideFocus() {
  const ctx = React.useContext(TideFocusContext)
  if (!ctx) {
    throw new Error('useTideFocus must be used within <TideFocusProvider>')
  }
  return ctx
}
