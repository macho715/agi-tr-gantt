'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useTideFocus } from '@/contexts/tide-focus-context'
import { isTideAllowsActivityName, toIsoDate } from '@/lib/tide-link'

export function TideLinkChip({
  taskId,
  taskName,
  taskStartDate,
  className,
}: {
  taskId?: string
  taskName: string
  taskStartDate: string | Date
  className?: string
}) {
  const { focusDate } = useTideFocus()

  const isTideTask = React.useMemo(() => isTideAllowsActivityName(taskName), [taskName])

  if (!isTideTask) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('h-6 px-2 text-xs', className)}
      onClick={(e) => {
        // Stop propagation so this does not interfere with existing row click/select behaviors.
        e.stopPropagation()

        focusDate(toIsoDate(taskStartDate), {
          type: 'task',
          taskId,
          taskName,
        })
      }}
      aria-label="Open Water Tide panel for this task date"
      title="Open Water Tide for this task date"
    >
      Tide
    </Button>
  )
}
