// components/configuration-panel.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProjectConfig } from "@/lib/types"
import { Settings, Calendar } from "lucide-react"

interface ConfigurationPanelProps {
  config: ProjectConfig
  onConfigChange: (config: ProjectConfig) => void
}

export function ConfigurationPanel({ config, onConfigChange }: ConfigurationPanelProps) {
  const updateConfig = (updates: Partial<ProjectConfig>) => {
    onConfigChange({ ...config, ...updates })
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
        {/* Project Start */}
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



// components/gantt-generator.tsx
"use client"

import { useState } from "react"
import { FileUploader } from "./file-uploader"
import { ConfigurationPanel } from "./configuration-panel"
import { GanttPreview } from "./gantt-preview"
import { GenerationStatus } from "./generation-status"
import type { ProjectConfig, UploadedFile, GenerationResult, ScheduleData } from "@/lib/types"

const defaultConfig: ProjectConfig = {
  projectStart: new Date().toISOString().split("T")[0],
}

export function GanttGenerator() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [config, setConfig] = useState<ProjectConfig>(defaultConfig)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(files)
    setError(null)
    setResult(null)
    setScheduleData(null)
  }

  const handleGenerate = async () => {
    if (uploadedFiles.length === 0) {
      setError("Please upload at least one TSV or JSON file")
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      uploadedFiles.forEach((file) => {
        formData.append("files", file.file)
      })
      formData.append("config", JSON.stringify(config))

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Generation failed")
      }

      setResult(data)
      setScheduleData(data.scheduleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Gantt Generator</h1>
              <p className="text-xs text-muted-foreground">Multi-scenario Excel workbook builder</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">v1.0.0</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Upload & Config - 높이 제한 */}
          <div className="lg:col-span-1 space-y-4">
            <FileUploader files={uploadedFiles} onFilesChange={handleFilesUploaded} />
            <ConfigurationPanel config={config} onConfigChange={setConfig} />
            <GenerationStatus
              isGenerating={isGenerating}
              error={error}
              result={result}
              onGenerate={handleGenerate}
              hasFiles={uploadedFiles.length > 0}
            />
          </div>

          {/* Right Column - Preview - 높이 자동 조정 */}
          <div className="lg:col-span-2">
            <GanttPreview scheduleData={scheduleData} config={config} isGenerating={isGenerating} />
          </div>
        </div>
      </div>
    </div>
  )
}


