"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProjectConfig } from "@/lib/types"
import { Settings, Calendar } from "lucide-react"

interface ConfigurationPanelProps {
  config: ProjectConfig
  onConfigChange: (config: ProjectConfig) => void
  compact?: boolean // Added compact prop
}

export function ConfigurationPanel({ config, onConfigChange, compact }: ConfigurationPanelProps) {
  const updateConfig = (updates: Partial<ProjectConfig>) => {
    onConfigChange({ ...config, ...updates })
  }

  if (compact) {
    return (
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="py-1.5 px-3 flex-shrink-0 border-b border-border">
          <CardTitle className="text-[10px] font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
            <Settings className="w-3 h-3" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 flex-1 flex flex-col justify-center">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              Project Start Date
            </Label>
            <Input
              type="date"
              value={config.projectStart}
              onChange={(e) => updateConfig({ projectStart: e.target.value })}
              className="bg-muted/50 border-border h-7 text-xs"
            />
            <p className="text-[9px] text-muted-foreground">All views sync automatically</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Project Start Date
          </Label>
          <Input
            type="date"
            value={config.projectStart}
            onChange={(e) => updateConfig({ projectStart: e.target.value })}
            className="bg-muted/50 border-border h-8"
          />
        </div>
      </CardContent>
    </Card>
  )
}
