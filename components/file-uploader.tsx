"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UploadedFile } from "@/lib/types"
import { parseUploadedFile, validateFileType } from "@/lib/file-parser"
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react"

interface FileUploaderProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  compact?: boolean // Added compact prop
}

export function FileUploader({ files, onFilesChange, compact }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [parseErrors, setParseErrors] = useState<string[]>([])

  const processFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: UploadedFile[] = []
      const errors: string[] = []

      for (const file of Array.from(fileList)) {
        const validation = validateFileType(file)
        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.error}`)
          continue
        }

        try {
          const parsed = await parseUploadedFile(file)
          newFiles.push(parsed)
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : "Parse error"}`)
        }
      }

      setParseErrors(errors)
      onFilesChange([...files, ...newFiles])
    },
    [files, onFilesChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [processFiles],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files)
      }
    },
    [processFiles],
  )

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  if (compact) {
    return (
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="py-1.5 px-3 flex-shrink-0 border-b border-border">
          <CardTitle className="text-[10px] font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
            <Upload className="w-3 h-3" />
            Input Files
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 flex-1 overflow-hidden flex flex-col gap-1.5">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border border-dashed rounded p-1.5 text-center transition-colors cursor-pointer flex-shrink-0
              ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
          >
            <input
              type="file"
              accept=".tsv,.json,.txt"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-input-compact"
            />
            <label htmlFor="file-input-compact" className="cursor-pointer flex items-center justify-center gap-1.5">
              <Upload className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Drop or click (TSV/JSON)</span>
            </label>
          </div>

          {parseErrors.length > 0 && <div className="text-[9px] text-destructive truncate">{parseErrors[0]}</div>}

          {files.length > 0 && (
            <div className="flex-1 overflow-auto space-y-0.5">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-0.5 px-1 bg-muted/50 rounded text-[10px]"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <FileText className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <CheckCircle2 className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-4 w-4 p-0">
                    <X className="w-2.5 h-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {files.length === 0 && parseErrors.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">No files uploaded</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="py-2 px-3 flex-shrink-0">
        <CardTitle className="text-xs font-medium flex items-center gap-2">
          <Upload className="w-3 h-3" />
          Input Files
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-1 overflow-auto space-y-2">
        {/* Drop Zone - Compact */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-md p-3 text-center transition-colors cursor-pointer
            ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}
          `}
        >
          <input
            type="file"
            accept=".tsv,.json,.txt"
            multiple
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <div className="text-left">
                <p className="text-xs font-medium text-foreground">Drop or click to upload</p>
                <p className="text-[10px] text-muted-foreground">TSV, JSON</p>
              </div>
            </div>
          </label>
        </div>

        {/* Parse Errors - Compact */}
        {parseErrors.length > 0 && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-[10px]">{parseErrors[0]}</AlertDescription>
          </Alert>
        )}

        {/* File List - Compact */}
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-1.5 bg-muted/50 rounded text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-foreground">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{file.recordCount}r</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <Button variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-5 w-5 p-0">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
