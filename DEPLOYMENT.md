# Gantt Generator - Deployment Guide

## Overview

This web application provides a UI for generating multi-scenario Excel Gantt workbooks. The frontend handles file uploads, configuration, and preview, while the backend integrates with your Python script for Excel generation.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js UI    │────▶│   API Routes    │────▶│  Python Script  │
│  (React/TS)     │     │  (Node.js)      │     │  (gantt_gen.py) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   File Upload            Input Validation         Excel Generation
   Config Form            Subprocess Call          VBA Code Injection
   Gantt Preview          File Management          Multi-scenario Sheets
```

## Python Integration Options

### Option 1: Subprocess (Simplest)

Install Python on your server and call the script directly:

```typescript
// In app/api/generate/route.ts
import { spawn } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

async function runPythonGenerator(inputData: string, config: ProjectConfig): Promise<Buffer> {
  const tempDir = tmpdir()
  const inputPath = join(tempDir, `input_${Date.now()}.json`)
  const outputPath = join(tempDir, `output_${Date.now()}.xlsx`)
  
  // Write input
  await writeFile(inputPath, JSON.stringify({ tasks: inputData, config }))
  
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [
      'scripts/gantt_generator.py',
      '--input', inputPath,
      '--output', outputPath,
    ])
    
    let stderr = ''
    python.stderr.on('data', (data) => stderr += data.toString())
    
    python.on('close', async (code) => {
      if (code !== 0) {
        await unlink(inputPath).catch(() => {})
        reject(new Error(`Python failed: ${stderr}`))
        return
      }
      
      try {
        const result = await readFile(outputPath)
        await unlink(inputPath)
        await unlink(outputPath)
        resolve(result)
      } catch (err) {
        reject(err)
      }
    })
  })
}
```

### Option 2: Docker Container (Recommended for Production)

Create a Docker image with Python and dependencies:

```dockerfile
# Dockerfile.python
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scripts/gantt_generator.py .

ENTRYPOINT ["python", "gantt_generator.py"]
```

```yaml
# docker-compose.yml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - python-worker
  
  python-worker:
    build:
      context: .
      dockerfile: Dockerfile.python
    volumes:
      - shared-files:/data
    
volumes:
  shared-files:
```

### Option 3: Serverless Function (AWS Lambda)

Deploy Python script as a Lambda function:

```python
# lambda_handler.py
import json
import boto3
from gantt_generator import generate_workbook

def handler(event, context):
    body = json.loads(event['body'])
    
    # Generate workbook
    excel_bytes = generate_workbook(
        tasks=body['tasks'],
        config=body['config']
    )
    
    # Upload to S3
    s3 = boto3.client('s3')
    key = f"generated/{context.aws_request_id}.xlsx"
    s3.put_object(Bucket='gantt-outputs', Key=key, Body=excel_bytes)
    
    # Generate presigned URL
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': 'gantt-outputs', 'Key': key},
        ExpiresIn=3600
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps({'downloadUrl': url})
    }
```

## Security Considerations

### Input Validation

1. **File Size Limits**: Already enforced (10MB max)
2. **File Type Validation**: Only TSV/JSON accepted
3. **Content Sanitization**: Validate all fields before passing to Python

```typescript
// Add to validation
function sanitizeInput(tasks: TaskInput[]): TaskInput[] {
  return tasks.map(task => ({
    id: task.id.replace(/[^a-zA-Z0-9-_]/g, ''),
    name: task.name.substring(0, 255),
    duration: Math.min(Math.max(1, task.duration), 365),
    category: task.category.replace(/[^a-zA-Z0-9-_]/g, ''),
    dependencies: task.dependencies?.slice(0, 50) || [],
    resources: task.resources?.slice(0, 20) || [],
    notes: task.notes?.substring(0, 1000) || '',
  }))
}
```

### Sandboxing (Docker)

Use gVisor or similar for untrusted input:

```bash
# Run with gVisor
docker run --runtime=runsc gantt-python
```

### Resource Limits

```typescript
// Set timeout for subprocess
const timeout = setTimeout(() => {
  python.kill('SIGTERM')
  reject(new Error('Generation timeout'))
}, 60000) // 60 second timeout

python.on('close', () => clearTimeout(timeout))
```

## Environment Variables

```env
# .env.local
PYTHON_PATH=/usr/bin/python3
TEMP_DIR=/tmp/gantt-generator
MAX_FILE_SIZE=10485760
GENERATION_TIMEOUT=60000
```

## Vercel Deployment

For Vercel deployment without server-side Python:

1. **Use a separate Python API** hosted on Railway, Render, or AWS Lambda
2. **Call the external API** from the Next.js route handler

```typescript
// app/api/generate/route.ts
const response = await fetch(process.env.PYTHON_API_URL!, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.PYTHON_API_KEY}`
  },
  body: JSON.stringify({ tasks, config }),
})
```

## Sample Python Script Interface

Your Python script should accept:

```bash
python gantt_generator.py --input input.json --output output.xlsx
```

Input JSON format:
```json
{
  "tasks": [
    {
      "id": "TASK-001",
      "name": "Site Preparation",
      "duration": 14,
      "category": "preparation",
      "dependencies": [],
      "resources": ["Crew A"]
    }
  ],
  "config": {
    "projectStart": "2025-02-01",
    "tideThreshold": 1.5,
    "shamalPeriod": { "start": "06-01", "end": "08-31" },
    "workPatterns": {
      "dayShift": { "start": "06:00", "end": "18:00" },
      "nightShift": { "start": "18:00", "end": "06:00" }
    },
    "scenarios": ["optimistic", "baseline", "pessimistic"]
  }
}
```

## Testing

```bash
# Test the API locally
curl -X POST http://localhost:3000/api/generate \
  -F "files=@sample.tsv" \
  -F 'config={"projectStart":"2025-01-01","scenarios":["baseline"]}'
