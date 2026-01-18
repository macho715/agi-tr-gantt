"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { GenerationResult } from "@/lib/types"
import { Play, Download, AlertCircle, Loader2, CheckCircle2, Zap } from "lucide-react"

interface GenerationStatusProps {
  isGenerating: boolean
  error: string | null
  result: GenerationResult | null
  onGenerate: () => void
  hasFiles: boolean
  compact?: boolean // Added compact prop
}

export function GenerationStatus({
  isGenerating,
  error,
  result,
  onGenerate,
  hasFiles,
  compact,
}: GenerationStatusProps) {
  if (compact) {
    return (
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="py-1.5 px-3 flex-shrink-0 border-b border-border">
          <CardTitle className="text-[10px] font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
            <Zap className="w-3 h-3" />
            Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 flex-1 flex flex-col justify-between gap-1.5">
          <Button onClick={onGenerate} disabled={isGenerating || !hasFiles} className="w-full h-7 text-xs" size="sm">
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                Generate Workbook
              </>
            )}
          </Button>

          <div className="flex-1 flex flex-col justify-center min-h-0">
            {error && <div className="text-[9px] text-destructive truncate">{error}</div>}

            {result && !error && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[9px] text-green-600">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>
                    {result.scenarioCount} scenarios, {result.taskCount} tasks
                  </span>
                </div>
                <Button variant="outline" size="sm" className="w-full h-6 text-[10px] bg-transparent" asChild>
                  <a href={result.downloadUrl} download={result.filename}>
                    <Download className="w-2.5 h-2.5 mr-1" />
                    Download
                  </a>
                </Button>
              </div>
            )}

            {!hasFiles && !error && !result && (
              <p className="text-[9px] text-muted-foreground text-center">Upload files to begin</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="py-2 px-3 flex-shrink-0">
        <CardTitle className="text-xs font-medium flex items-center gap-2">
          <Zap className="w-3 h-3" />
          Generate
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-between gap-2">
        <Button onClick={onGenerate} disabled={isGenerating || !hasFiles} className="w-full" size="sm">
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-1.5" />
              Generate Workbook
            </>
          )}
        </Button>

        <div className="flex-1 flex flex-col justify-center">
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-3 w-3" />
              <AlertDescription className="text-[10px]">{error}</AlertDescription>
            </Alert>
          )}

          {result && !error && (
            <div className="space-y-2">
              <Alert className="border-green-500/50 bg-green-500/10 py-2">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <AlertDescription className="text-[10px] text-green-600">
                  Generated! {result.scenarioCount} scenarios, {result.taskCount} tasks
                </AlertDescription>
              </Alert>
              <Button variant="outline" size="sm" className="w-full bg-transparent text-xs" asChild>
                <a href={result.downloadUrl} download={result.filename}>
                  <Download className="w-3 h-3 mr-1.5" />
                  {result.filename}
                </a>
              </Button>
            </div>
          )}

          {!hasFiles && !error && !result && (
            <p className="text-[10px] text-muted-foreground text-center">Upload files to begin</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
