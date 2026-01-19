# AGI TR Gantt Generator - Deployment Guide

## Overview

This web application provides a UI for generating multi-scenario Excel Gantt workbooks from TSV/JSON task files. The frontend handles file uploads, configuration, and preview, while the backend integrates with Python scripts for Excel generation.

**Current Status**: Frontend and file parsing are fully implemented. Excel generation requires Python script integration.

## Architecture

```

┌─────────────────────────────────────────────────────────────┐
│                    Client Browser                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Next.js Frontend (React 19 + TypeScript)      │   │
│  │  - File Upload & Validation                           │   │
│  │  - Configuration Panel                                │   │
│  │  - Real-time Gantt Preview                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP/HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Server (Node.js 18+)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Routes (App Router)                  │   │
│  │  ┌──────────────┐         ┌──────────────┐            │   │
│  │  │/api/generate  │         │/api/download│            │   │
│  │  └──────────────┘         └──────────────┘            │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      File Parser (lib/file-parser.ts)                 │   │
│  │  ✅ TSV/CSV Parser (implemented)                      │   │
│  │  ✅ JSON Parser (implemented)                         │   │
│  │  ✅ Header Mapping & Validation (implemented)           │   │
│  │  ✅ WBS Hierarchy Builder (implemented)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Schedule Generator (app/api/generate/route.ts)      │   │
│  │  ✅ Task Parsing (implemented)                        │   │
│  │  ✅ Schedule Calculation (implemented)                 │   │
│  │  ⚠️  Excel Generation (requires Python integration)    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         Excel Generation Service (External - Required)       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Option 1: Python Subprocess (same server)           │   │
│  │  Option 2: Docker Container (recommended)              │   │
│  │  Option 3: Serverless Function (AWS Lambda/Cloud Run)│   │
│  │  Option 4: External API (Railway/Render/AWS)          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

```

## Current Implementation Status

### ✅ Implemented Features

- **File Upload & Validation**: Multi-file drag & drop, type/size validation
- **File Parsing**: TSV/CSV/JSON parsers with flexible header mapping
- **WBS Hierarchy**: 3-level Activity ID support (Activity ID 1, 2, 3)
- **Schedule Generation**: Task scheduling with date calculations
- **Gantt Preview**: Real-time visual preview of schedule
- **UI Components**: Complete React component library (shadcn/ui)
- **Type Safety**: Full TypeScript implementation

### ⚠️ Requires Integration

- **Excel Generation**: Python script integration needed
- **File Storage**: Temporary file storage for generated Excel files
- **Download Endpoint**: Currently returns sample Excel (needs real file)

## Python Integration Options

### Option 1: Subprocess (Simplest - Same Server)

**Best for**: Development, small deployments, single-server setups

Install Python 3.11+ on your server and call the script directly:

```typescript
// app/api/generate/route.ts
import { spawn } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { TaskInput, ProjectConfig } from '@/lib/types'

async function runPythonGenerator(
  tasks: TaskInput[],
  config: ProjectConfig
): Promise<Buffer> {
  const tempDir = tmpdir()
  const timestamp = Date.now()
  const inputPath = join(tempDir, `gantt_input_${timestamp}.json`)
  const outputPath = join(tempDir, `gantt_output_${timestamp}.xlsx`)

  // Prepare input data matching your Python script's expected format
  const inputData = {
    tasks: tasks.map(task => ({
      activityId1: task.activityId1,
      activityId2: task.activityId2,
      activityId3: task.activityId3,
      activityName: task.activityName,
      originalDuration: task.originalDuration,
      plannedStart: task.plannedStart,
      plannedFinish: task.plannedFinish,
      fullActivityId: task.fullActivityId,
      level: task.level,
    })),
    config: {
      projectStart: config.projectStart,
      scenarios: config.scenarios || ['baseline', 'optimistic', 'pessimistic'],
    }
  }

  // Write input JSON
  await writeFile(inputPath, JSON.stringify(inputData, null, 2))

  return new Promise((resolve, reject) => {
    const python = spawn('python3', [
      'scripts/gantt_generator.py',
      '--input', inputPath,
      '--output', outputPath,
    ], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })

    let stderr = ''
    let stdout = ''

    python.stdout.on('data', (data) => {
      stdout += data.toString()
      console.log(`Python stdout: ${data}`)
    })

    python.stderr.on('data', (data) => {
      stderr += data.toString()
      console.error(`Python stderr: ${data}`)
    })

    const timeout = setTimeout(() => {
      python.kill('SIGTERM')
      reject(new Error('Python script timeout after 60 seconds'))
    }, 60000) // 60 second timeout

    python.on('close', async (code) => {
      clearTimeout(timeout)

      if (code !== 0) {
        await unlink(inputPath).catch(() => {})
        await unlink(outputPath).catch(() => {})
        reject(new Error(`Python script failed with code ${code}: ${stderr}`))
        return
      }

      try {
        const result = await readFile(outputPath)
        // Cleanup
        await unlink(inputPath).catch(() => {})
        await unlink(outputPath).catch(() => {})
        resolve(result)
      } catch (err) {
        await unlink(inputPath).catch(() => {})
        await unlink(outputPath).catch(() => {})
        reject(new Error(`Failed to read output file: ${err}`))
      }
    })
  })
}

// Update the POST handler in /api/generate/route.ts
export async function POST(request: NextRequest) {
  // ... existing file parsing code ...

  // After generating scheduleData, call Python generator
  try {
    const excelBuffer = await runPythonGenerator(allTasks, config)

    // Store file temporarily (in-memory or filesystem)
    const fileId = Date.now().toString()
    // TODO: Store excelBuffer with fileId (use Redis, filesystem, or S3)

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/download?id=${fileId}`,
      filename: `gantt_schedule_${new Date().toISOString().split("T")[0]}.xlsx`,
      scenarioCount: config.scenarios?.length || 3,
      taskCount: allTasks.length,
      scheduleData,
    })
  } catch (err) {
    console.error("Excel generation error:", err)
    return NextResponse.json(
      { error: `Excel generation failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}
```

**Requirements**:

- Python 3.11+ installed on server
- Required Python packages: `openpyxl`, `pandas` (or your dependencies)
- Script location: `scripts/gantt_generator.py`

### Option 2: Docker Container (Recommended for Production)

**Best for**: Production deployments, isolation, dependency management

#### Dockerfile for Python Service

```dockerfile
# Dockerfile.python
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python script
COPY scripts/gantt_generator.py .

# Create shared volume mount point
VOLUME ["/data"]

ENTRYPOINT ["python", "gantt_generator.py"]
```

#### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PYTHON_SERVICE_URL=http://python-worker:8000
    depends_on:
      - python-worker
    volumes:
      - ./app:/app/app
      - ./public:/app/public
    restart: unless-stopped

  python-worker:
    build:
      context: .
      dockerfile: Dockerfile.python
    ports:
      - "8000:8000"
    volumes:
      - shared-files:/data
    restart: unless-stopped
    # Or run as HTTP service
    command: python -m http.server 8000

volumes:
  shared-files:
```

#### Next.js API Integration

```typescript
// app/api/generate/route.ts
async function runPythonGeneratorViaDocker(
  tasks: TaskInput[],
  config: ProjectConfig
): Promise<Buffer> {
  const inputData = {
    tasks,
    config
  }

  // Option A: HTTP API (if Python service exposes HTTP endpoint)
  const response = await fetch(process.env.PYTHON_SERVICE_URL || 'http://python-worker:8000/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputData),
  })

  if (!response.ok) {
    throw new Error(`Python service error: ${response.statusText}`)
  }

  return Buffer.from(await response.arrayBuffer())

  // Option B: Shared volume (write to shared volume, read result)
  // const tempDir = '/data' // Shared volume
  // ... similar to subprocess approach but using shared volume
}
```

### Option 3: Serverless Function (AWS Lambda / Google Cloud Functions)

**Best for**: Scalability, cost efficiency, cloud-native deployments

#### AWS Lambda Handler

```python
# lambda_handler.py
import json
import boto3
from io import BytesIO
from gantt_generator import generate_workbook

def handler(event, context):
    try:
        body = json.loads(event['body'])
        tasks = body['tasks']
        config = body['config']

        # Generate workbook
        excel_bytes = generate_workbook(tasks=tasks, config=config)

        # Upload to S3
        s3 = boto3.client('s3')
        bucket_name = os.environ.get('S3_BUCKET', 'gantt-outputs')
        key = f"generated/{context.aws_request_id}.xlsx"

        s3.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=excel_bytes,
            ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        # Generate presigned URL (valid for 1 hour)
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': key},
            ExpiresIn=3600
        )

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'downloadUrl': url,
                'filename': f"gantt_schedule_{config.get('projectStart', 'unknown')}.xlsx"
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

#### Next.js Integration

```typescript
// app/api/generate/route.ts
async function runPythonGeneratorViaLambda(
  tasks: TaskInput[],
  config: ProjectConfig
): Promise<{ downloadUrl: string, filename: string }> {
  const response = await fetch(process.env.AWS_LAMBDA_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.AWS_LAMBDA_API_KEY}`
    },
    body: JSON.stringify({ tasks, config }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Lambda function failed')
  }

  const result = await response.json()
  return {
    downloadUrl: result.downloadUrl,
    filename: result.filename
  }
}
```

### Option 4: External API Service (Railway / Render / Fly.io)

**Best for**: Quick deployment, managed infrastructure

Deploy Python script as a separate API service and call it from Next.js:

```typescript
// app/api/generate/route.ts
async function runPythonGeneratorViaAPI(
  tasks: TaskInput[],
  config: ProjectConfig
): Promise<Buffer> {
  const response = await fetch(process.env.PYTHON_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PYTHON_API_KEY}`
    },
    body: JSON.stringify({ tasks, config }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Python API failed')
  }

  return Buffer.from(await response.arrayBuffer())
}
```

## File Storage Strategy

### Option 1: In-Memory (Development Only)

```typescript
// Simple in-memory store (not recommended for production)
const fileStore = new Map<string, Buffer>()

// In /api/generate
const fileId = Date.now().toString()
fileStore.set(fileId, excelBuffer)

// In /api/download
const file = fileStore.get(id)
if (!file) {
  return NextResponse.json({ error: 'File not found' }, { status: 404 })
}
fileStore.delete(id) // Cleanup after download
```

### Option 2: Filesystem (Single Server)

```typescript
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const STORAGE_DIR = join(tmpdir(), 'gantt-files')

// In /api/generate
const fileId = Date.now().toString()
const filePath = join(STORAGE_DIR, `${fileId}.xlsx`)
await writeFile(filePath, excelBuffer)

// In /api/download
const filePath = join(STORAGE_DIR, `${id}.xlsx`)
const file = await readFile(filePath)
await unlink(filePath) // Cleanup
```

### Option 3: Object Storage (S3 / GCS / Azure Blob) - Recommended

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({ region: process.env.AWS_REGION })

// In /api/generate
const fileId = Date.now().toString()
const key = `generated/${fileId}.xlsx`

await s3.send(new PutObjectCommand({
  Bucket: process.env.S3_BUCKET!,
  Key: key,
  Body: excelBuffer,
  ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}))

// Generate presigned URL
const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({
  Bucket: process.env.S3_BUCKET!,
  Key: key,
}), { expiresIn: 3600 }) // 1 hour

// In /api/download - redirect to presigned URL or fetch and stream
```

### Option 4: Redis (Fast, Temporary)

```typescript
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

// In /api/generate
const fileId = Date.now().toString()
await redis.setex(`gantt:${fileId}`, 3600, excelBuffer.toString('base64')) // 1 hour TTL

// In /api/download
const base64 = await redis.get(`gantt:${id}`)
if (!base64) {
  return NextResponse.json({ error: 'File not found' }, { status: 404 })
}
const buffer = Buffer.from(base64, 'base64')
await redis.del(`gantt:${id}`) // Cleanup
```

## Security Considerations

### Input Validation

Already implemented in `lib/file-parser.ts`:

- ✅ File type whitelist (TSV/JSON only)
- ✅ File size limit (10MB max)
- ✅ Header validation
- ✅ Data type validation

### Additional Security Measures

```typescript
// Add rate limiting
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 m'), // 10 requests per 10 minutes
})

// In /api/generate
const { success } = await ratelimit.limit(request.headers.get('x-forwarded-for') || 'anonymous')
if (!success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

### Sandboxing (Docker)

```bash
# Run with gVisor for additional security
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

Create `.env.local` for local development:

```env
# Python Integration
PYTHON_PATH=/usr/bin/python3
PYTHON_API_URL=http://localhost:8000/generate
PYTHON_API_KEY=your-api-key-here

# File Storage
STORAGE_TYPE=filesystem  # or 's3', 'redis', 'memory'
S3_BUCKET=gantt-outputs
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
REDIS_URL=redis://localhost:6379

# Limits
MAX_FILE_SIZE=10485760  # 10MB in bytes
GENERATION_TIMEOUT=60000  # 60 seconds in milliseconds
TEMP_DIR=/tmp/gantt-generator

# Security
RATE_LIMIT_ENABLED=true
ALLOWED_ORIGINS=https://yourdomain.com
```

## Deployment Platforms

### Vercel (Recommended for Next.js)

**Limitations**: No server-side Python support

**Solution**: Use external Python API

1. Deploy Next.js app to Vercel
2. Deploy Python service separately (Railway, Render, AWS Lambda)
3. Configure environment variables

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add PYTHON_API_URL
vercel env add PYTHON_API_KEY
```

### Railway

Full-stack deployment with Python support:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Docker / Self-Hosted

```bash
# Build and run
docker-compose up -d

# Or with Dockerfile
docker build -t gantt-generator .
docker run -p 3000:3000 gantt-generator
```

### AWS (ECS / EC2)

```bash
# Build Docker image
docker build -t gantt-generator .

# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag gantt-generator:latest <account>.dkr.ecr.<region>.amazonaws.com/gantt-generator:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/gantt-generator:latest
```

## Python Script Interface

Your Python script should accept the following input format:

### Command Line Interface

```bash
python gantt_generator.py --input input.json --output output.xlsx
```

### Input JSON Format

```json
{
  "tasks": [
    {
      "activityId1": "1.0",
      "activityId2": "1.1",
      "activityId3": "1.1.1",
      "activityName": "Site Preparation",
      "originalDuration": 14,
      "plannedStart": "2025-02-01",
      "plannedFinish": "2025-02-15",
      "fullActivityId": "1.0.1.1.1.1.1",
      "level": 3
    }
  ],
  "config": {
    "projectStart": "2025-02-01",
    "scenarios": ["baseline", "optimistic", "pessimistic"]
  }
}
```

### Expected Output

- Excel workbook (.xlsx) with:
  - Control panel sheet with settings
  - Multiple scenario sheets (one per scenario)
  - VBA macros for interactivity
  - Gantt chart visualization

## Testing

### Local API Testing

```bash
# Test file upload
curl -X POST http://localhost:3000/api/generate \
  -F "files=@public/sample-tasks.tsv" \
  -F 'config={"projectStart":"2025-01-01","scenarios":["baseline"]}'

# Test download
curl -O http://localhost:3000/api/download?id=1234567890
```

### Integration Testing

```typescript
// __tests__/api/generate.test.ts
import { POST } from '@/app/api/generate/route'
import { NextRequest } from 'next/server'

describe('/api/generate', () => {
  it('should process TSV file', async () => {
    const formData = new FormData()
    const file = new File(['content'], 'test.tsv', { type: 'text/tab-separated-values' })
    formData.append('files', file)
    formData.append('config', JSON.stringify({ projectStart: '2025-01-01' }))

    const request = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
```

## Monitoring & Logging

### Error Logging

```typescript
// lib/logger.ts
import { logger } from '@/lib/logger'

// In API routes
try {
  // ... generation logic
} catch (err) {
  logger.error('Excel generation failed', {
    error: err,
    taskCount: tasks.length,
    userId: request.headers.get('user-id'),
  })
  throw err
}
```

### Performance Monitoring

```typescript
// Add performance tracking
const startTime = Date.now()
// ... generation logic
const duration = Date.now() - startTime
logger.info('Generation completed', { duration, taskCount: tasks.length })
```

## Troubleshooting

### Common Issues

1. **Python script not found**

   - Check `PYTHON_PATH` environment variable
   - Verify script exists at expected location
   - Check file permissions
2. **Timeout errors**

   - Increase `GENERATION_TIMEOUT`
   - Optimize Python script performance
   - Consider async processing with job queue
3. **File storage errors**

   - Check disk space
   - Verify S3/Redis credentials
   - Check network connectivity
4. **Memory issues**

   - Process files in batches
   - Stream large files
   - Increase server memory

## Next Steps

1. ✅ Implement Python script integration (choose one option above)
2. ✅ Implement file storage solution
3. ✅ Update `/api/download` to serve real files
4. ✅ Add error handling and logging
5. ✅ Add rate limiting
6. ✅ Set up monitoring
7. ✅ Write integration tests
8. ✅ Deploy to production

---

## Related Documentation

- [System Architecture](./SYSTEM_ARCHITECTURE.md) / [시스템 아키텍처 (한국어)](../SYSTEM_ARCHITECTURE_KO.md) - Technical architecture documentation
- [System Layout](../SYSTEM_LAYOUT.md) / [System Layout (English)](./SYSTEM_LAYOUT_EN.md) - Component hierarchy and UI layout details

---

**Last Updated**: 2025-01-01
**Version**: 2.0.0
