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

  const updateConfig = (updates: Partial<ProjectConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-y-auto">
      {/* Header */}
      <header className="border-b border-border bg-card flex-shrink-0">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">AGI TR Gantt Generator</h1>
            </div>
          </div>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">v1.0.0</span>
        </div>
      </header>

      <div className="flex-shrink-0 border-b border-border bg-muted/30 px-4 py-2">
        {/* Input Files Box */}
        <div className="container mx-auto grid grid-cols-3 gap-4 min-h-[70px]">
          <FileUploader files={uploadedFiles} onFilesChange={handleFilesUploaded} compact />

          {/* Settings Box */}
          <ConfigurationPanel config={config} onConfigChange={updateConfig} compact />

          {/* Generator Box */}
          <GenerationStatus
            isGenerating={isGenerating}
            error={error}
            result={result}
            onGenerate={handleGenerate}
            hasFiles={uploadedFiles.length > 0}
            compact
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="container mx-auto px-4 py-3">
          <GanttPreview scheduleData={scheduleData} config={config} isGenerating={isGenerating} />
        </div>
      </div>
    </div>
  )
}
