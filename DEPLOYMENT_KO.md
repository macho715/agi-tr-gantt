# AGI TR Gantt Generator - 배포 가이드

## 개요

이 웹 애플리케이션은 TSV/JSON 작업 파일로부터 다중 시나리오 Excel Gantt 워크북을 생성하는 UI를 제공합니다. 프론트엔드는 파일 업로드, 설정, 미리보기를 처리하고, 백엔드는 Excel 생성을 위한 Python 스크립트와 통합됩니다.

**현재 상태**: 프론트엔드와 파일 파싱이 완전히 구현되었습니다. Excel 생성은 Python 스크립트 통합이 필요합니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    클라이언트 브라우저                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Next.js 프론트엔드 (React 19 + TypeScript)    │   │
│  │  - 파일 업로드 및 검증                                 │   │
│  │  - 설정 패널                                          │   │
│  │  - 실시간 Gantt 미리보기                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP/HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js 서버 (Node.js 18+)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API 라우트 (App Router)                  │   │
│  │  ┌──────────────┐         ┌──────────────┐            │   │
│  │  │/api/generate  │         │/api/download│            │   │
│  │  └──────────────┘         └──────────────┘            │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      파일 파서 (lib/file-parser.ts)                   │   │
│  │  ✅ TSV/CSV 파서 (구현됨)                              │   │
│  │  ✅ JSON 파서 (구현됨)                                 │   │
│  │  ✅ 헤더 매핑 및 검증 (구현됨)                           │   │
│  │  ✅ WBS 계층 구조 빌더 (구현됨)                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   일정 생성기 (app/api/generate/route.ts)              │   │
│  │  ✅ 작업 파싱 (구현됨)                                 │   │
│  │  ✅ 일정 계산 (구현됨)                                 │   │
│  │  ⚠️  Excel 생성 (Python 통합 필요)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         Excel 생성 서비스 (외부 - 필수)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  옵션 1: Python Subprocess (동일 서버)               │   │
│  │  옵션 2: Docker 컨테이너 (권장)                      │   │
│  │  옵션 3: 서버리스 함수 (AWS Lambda/Cloud Run)        │   │
│  │  옵션 4: 외부 API (Railway/Render/AWS)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 현재 구현 상태

### ✅ 구현된 기능

- **파일 업로드 및 검증**: 다중 파일 드래그 앤 드롭, 타입/크기 검증
- **파일 파싱**: 유연한 헤더 매핑을 가진 TSV/CSV/JSON 파서
- **WBS 계층 구조**: 3단계 Activity ID 지원 (Activity ID 1, 2, 3)
- **일정 생성**: 날짜 계산을 포함한 작업 일정 생성
- **Gantt 미리보기**: 일정의 실시간 시각적 미리보기
- **UI 컴포넌트**: 완전한 React 컴포넌트 라이브러리 (shadcn/ui)
- **타입 안전성**: 완전한 TypeScript 구현

### ⚠️ 통합 필요

- **Excel 생성**: Python 스크립트 통합 필요
- **파일 저장소**: 생성된 Excel 파일을 위한 임시 파일 저장소
- **다운로드 엔드포인트**: 현재 샘플 Excel 반환 (실제 파일 필요)

## Python 통합 옵션

### 옵션 1: Subprocess (가장 간단 - 동일 서버)

**최적 용도**: 개발, 소규모 배포, 단일 서버 설정

서버에 Python 3.11+를 설치하고 스크립트를 직접 호출:

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

  // Python 스크립트가 예상하는 형식에 맞는 입력 데이터 준비
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

  // 입력 JSON 작성
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
      reject(new Error('Python 스크립트가 60초 후 타임아웃되었습니다'))
    }, 60000) // 60초 타임아웃

    python.on('close', async (code) => {
      clearTimeout(timeout)

      if (code !== 0) {
        await unlink(inputPath).catch(() => {})
        await unlink(outputPath).catch(() => {})
        reject(new Error(`Python 스크립트가 코드 ${code}로 실패했습니다: ${stderr}`))
        return
      }

      try {
        const result = await readFile(outputPath)
        // 정리
        await unlink(inputPath).catch(() => {})
        await unlink(outputPath).catch(() => {})
        resolve(result)
      } catch (err) {
        await unlink(inputPath).catch(() => {})
        await unlink(outputPath).catch(() => {})
        reject(new Error(`출력 파일 읽기 실패: ${err}`))
      }
    })
  })
}

// /api/generate/route.ts의 POST 핸들러 업데이트
export async function POST(request: NextRequest) {
  // ... 기존 파일 파싱 코드 ...

  // scheduleData 생성 후, Python 생성기 호출
  try {
    const excelBuffer = await runPythonGenerator(allTasks, config)

    // 파일을 임시로 저장 (메모리 또는 파일시스템)
    const fileId = Date.now().toString()
    // TODO: fileId와 함께 excelBuffer 저장 (Redis, filesystem, 또는 S3 사용)

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/download?id=${fileId}`,
      filename: `gantt_schedule_${new Date().toISOString().split("T")[0]}.xlsx`,
      scenarioCount: config.scenarios?.length || 3,
      taskCount: allTasks.length,
      scheduleData,
    })
  } catch (err) {
    console.error("Excel 생성 오류:", err)
    return NextResponse.json(
      { error: `Excel 생성 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}` },
      { status: 500 }
    )
  }
}
```

**요구사항**:

- 서버에 Python 3.11+ 설치
- 필요한 Python 패키지: `openpyxl`, `pandas` (또는 의존성)
- 스크립트 위치: `scripts/gantt_generator.py`

### 옵션 2: Docker 컨테이너 (프로덕션 권장)

**최적 용도**: 프로덕션 배포, 격리, 의존성 관리

#### Python 서비스를 위한 Dockerfile

```dockerfile
# Dockerfile.python
FROM python:3.11-slim

WORKDIR /app

# 필요한 경우 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# requirements 복사
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Python 스크립트 복사
COPY scripts/gantt_generator.py .

# 공유 볼륨 마운트 포인트 생성
VOLUME ["/data"]

ENTRYPOINT ["python", "gantt_generator.py"]
```

#### Docker Compose 설정

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
    # 또는 HTTP 서비스로 실행
    command: python -m http.server 8000

volumes:
  shared-files:
```

#### Next.js API 통합

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

  // 옵션 A: HTTP API (Python 서비스가 HTTP 엔드포인트를 노출하는 경우)
  const response = await fetch(process.env.PYTHON_SERVICE_URL || 'http://python-worker:8000/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputData),
  })

  if (!response.ok) {
    throw new Error(`Python 서비스 오류: ${response.statusText}`)
  }

  return Buffer.from(await response.arrayBuffer())

  // 옵션 B: 공유 볼륨 (공유 볼륨에 쓰고, 결과 읽기)
  // const tempDir = '/data' // 공유 볼륨
  // ... subprocess 접근 방식과 유사하지만 공유 볼륨 사용
}
```

### 옵션 3: 서버리스 함수 (AWS Lambda / Google Cloud Functions)

**최적 용도**: 확장성, 비용 효율성, 클라우드 네이티브 배포

#### AWS Lambda 핸들러

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

        # 워크북 생성
        excel_bytes = generate_workbook(tasks=tasks, config=config)

        # S3에 업로드
        s3 = boto3.client('s3')
        bucket_name = os.environ.get('S3_BUCKET', 'gantt-outputs')
        key = f"generated/{context.aws_request_id}.xlsx"

        s3.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=excel_bytes,
            ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        # 사전 서명된 URL 생성 (1시간 유효)
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

#### Next.js 통합

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
    throw new Error(error.error || 'Lambda 함수 실패')
  }

  const result = await response.json()
  return {
    downloadUrl: result.downloadUrl,
    filename: result.filename
  }
}
```

### 옵션 4: 외부 API 서비스 (Railway / Render / Fly.io)

**최적 용도**: 빠른 배포, 관리형 인프라

Python 스크립트를 별도의 API 서비스로 배포하고 Next.js에서 호출:

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
    throw new Error(error.error || 'Python API 실패')
  }

  return Buffer.from(await response.arrayBuffer())
}
```

## 파일 저장소 전략

### 옵션 1: 메모리 내 (개발 전용)

```typescript
// 간단한 메모리 저장소 (프로덕션에는 권장하지 않음)
const fileStore = new Map<string, Buffer>()

// /api/generate에서
const fileId = Date.now().toString()
fileStore.set(fileId, excelBuffer)

// /api/download에서
const file = fileStore.get(id)
if (!file) {
  return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })
}
fileStore.delete(id) // 다운로드 후 정리
```

### 옵션 2: 파일시스템 (단일 서버)

```typescript
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const STORAGE_DIR = join(tmpdir(), 'gantt-files')

// /api/generate에서
const fileId = Date.now().toString()
const filePath = join(STORAGE_DIR, `${fileId}.xlsx`)
await writeFile(filePath, excelBuffer)

// /api/download에서
const filePath = join(STORAGE_DIR, `${id}.xlsx`)
const file = await readFile(filePath)
await unlink(filePath) // 정리
```

### 옵션 3: 객체 저장소 (S3 / GCS / Azure Blob) - 권장

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({ region: process.env.AWS_REGION })

// /api/generate에서
const fileId = Date.now().toString()
const key = `generated/${fileId}.xlsx`

await s3.send(new PutObjectCommand({
  Bucket: process.env.S3_BUCKET!,
  Key: key,
  Body: excelBuffer,
  ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}))

// 사전 서명된 URL 생성
const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({
  Bucket: process.env.S3_BUCKET!,
  Key: key,
}), { expiresIn: 3600 }) // 1시간

// /api/download - 사전 서명된 URL로 리다이렉트하거나 가져와서 스트리밍
```

### 옵션 4: Redis (빠름, 임시)

```typescript
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

// /api/generate에서
const fileId = Date.now().toString()
await redis.setex(`gantt:${fileId}`, 3600, excelBuffer.toString('base64')) // 1시간 TTL

// /api/download에서
const base64 = await redis.get(`gantt:${id}`)
if (!base64) {
  return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })
}
const buffer = Buffer.from(base64, 'base64')
await redis.del(`gantt:${id}`) // 정리
```

## 보안 고려사항

### 입력 검증

`lib/file-parser.ts`에 이미 구현됨:

- ✅ 파일 타입 화이트리스트 (TSV/JSON만 허용)
- ✅ 파일 크기 제한 (최대 10MB)
- ✅ 헤더 검증
- ✅ 데이터 타입 검증

### 추가 보안 조치

```typescript
// 속도 제한 추가
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 m'), // 10분에 10회 요청
})

// /api/generate에서
const { success } = await ratelimit.limit(request.headers.get('x-forwarded-for') || 'anonymous')
if (!success) {
  return NextResponse.json({ error: '속도 제한 초과' }, { status: 429 })
}
```

### 샌드박싱 (Docker)

```bash
# 추가 보안을 위해 gVisor로 실행
docker run --runtime=runsc gantt-python
```

### 리소스 제한

```typescript
// subprocess에 타임아웃 설정
const timeout = setTimeout(() => {
  python.kill('SIGTERM')
  reject(new Error('생성 타임아웃'))
}, 60000) // 60초 타임아웃

python.on('close', () => clearTimeout(timeout))
```

## 환경 변수

로컬 개발을 위해 `.env.local` 생성:

```env
# Python 통합
PYTHON_PATH=/usr/bin/python3
PYTHON_API_URL=http://localhost:8000/generate
PYTHON_API_KEY=your-api-key-here

# 파일 저장소
STORAGE_TYPE=filesystem  # 또는 's3', 'redis', 'memory'
S3_BUCKET=gantt-outputs
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
REDIS_URL=redis://localhost:6379

# 제한
MAX_FILE_SIZE=10485760  # 바이트 단위 10MB
GENERATION_TIMEOUT=60000  # 밀리초 단위 60초
TEMP_DIR=/tmp/gantt-generator

# 보안
RATE_LIMIT_ENABLED=true
ALLOWED_ORIGINS=https://yourdomain.com
```

## 배포 플랫폼

### Vercel (Next.js 권장)

**제한사항**: 서버 측 Python 지원 없음

**해결책**: 외부 Python API 사용

1. Next.js 앱을 Vercel에 배포
2. Python 서비스를 별도로 배포 (Railway, Render, AWS Lambda)
3. 환경 변수 구성

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경 변수 설정
vercel env add PYTHON_API_URL
vercel env add PYTHON_API_KEY
```

### Railway

Python 지원을 포함한 전체 스택 배포:

```bash
# Railway CLI 설치
npm i -g @railway/cli

# 로그인 및 배포
railway login
railway init
railway up
```

### Docker / 자체 호스팅

```bash
# 빌드 및 실행
docker-compose up -d

# 또는 Dockerfile 사용
docker build -t gantt-generator .
docker run -p 3000:3000 gantt-generator
```

### AWS (ECS / EC2)

```bash
# Docker 이미지 빌드
docker build -t gantt-generator .

# ECR에 푸시
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag gantt-generator:latest <account>.dkr.ecr.<region>.amazonaws.com/gantt-generator:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/gantt-generator:latest
```

## Python 스크립트 인터페이스

Python 스크립트는 다음 입력 형식을 받아야 합니다:

### 명령줄 인터페이스

```bash
python gantt_generator.py --input input.json --output output.xlsx
```

### 입력 JSON 형식

```json
{
  "tasks": [
    {
      "activityId1": "1.0",
      "activityId2": "1.1",
      "activityId3": "1.1.1",
      "activityName": "현장 준비",
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

### 예상 출력

- Excel 워크북 (.xlsx) 포함:
  - 설정이 있는 제어판 시트
  - 다중 시나리오 시트 (시나리오당 하나)
  - 대화형을 위한 VBA 매크로
  - Gantt 차트 시각화

## 테스트

### 로컬 API 테스트

```bash
# 파일 업로드 테스트
curl -X POST http://localhost:3000/api/generate \
  -F "files=@public/sample-tasks.tsv" \
  -F 'config={"projectStart":"2025-01-01","scenarios":["baseline"]}'

# 다운로드 테스트
curl -O http://localhost:3000/api/download?id=1234567890
```

### 통합 테스트

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

## 모니터링 및 로깅

### 오류 로깅

```typescript
// lib/logger.ts
import { logger } from '@/lib/logger'

// API 라우트에서
try {
  // ... 생성 로직
} catch (err) {
  logger.error('Excel 생성 실패', {
    error: err,
    taskCount: tasks.length,
    userId: request.headers.get('user-id'),
  })
  throw err
}
```

### 성능 모니터링

```typescript
// 성능 추적 추가
const startTime = Date.now()
// ... 생성 로직
const duration = Date.now() - startTime
logger.info('생성 완료', { duration, taskCount: tasks.length })
```

## 문제 해결

### 일반적인 문제

1. **Python 스크립트를 찾을 수 없음**

   - `PYTHON_PATH` 환경 변수 확인
   - 스크립트가 예상 위치에 있는지 확인
   - 파일 권한 확인

2. **타임아웃 오류**

   - `GENERATION_TIMEOUT` 증가
   - Python 스크립트 성능 최적화
   - 작업 큐를 사용한 비동기 처리 고려

3. **파일 저장소 오류**

   - 디스크 공간 확인
   - S3/Redis 자격 증명 확인
   - 네트워크 연결 확인

4. **메모리 문제**

   - 파일을 배치로 처리
   - 대용량 파일 스트리밍
   - 서버 메모리 증가

## 다음 단계

1. ✅ Python 스크립트 통합 구현 (위 옵션 중 선택)
2. ✅ 파일 저장소 솔루션 구현
3. ✅ `/api/download`를 실제 파일 제공하도록 업데이트
4. ✅ 오류 처리 및 로깅 추가
5. ✅ 속도 제한 추가
6. ✅ 모니터링 설정
7. ✅ 통합 테스트 작성
8. ✅ 프로덕션 배포

---

## 관련 문서

- [시스템 아키텍처](./SYSTEM_ARCHITECTURE.md) / [시스템 아키텍처 (한국어)](./SYSTEM_ARCHITECTURE_KO.md) - 기술 아키텍처 문서
- [시스템 레이아웃](./SYSTEM_LAYOUT.md) / [시스템 레이아웃 (영어)](./SYSTEM_LAYOUT_EN.md) - 컴포넌트 계층 구조 및 UI 레이아웃 상세 정보

---

**최종 업데이트**: 2025-01-01
**버전**: 2.0.0
