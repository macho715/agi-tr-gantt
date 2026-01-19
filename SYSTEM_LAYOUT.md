# 시스템 전체 레이아웃 문서

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [디렉토리 구조](#디렉토리-구조)
4. [아키텍처 개요](#아키텍처-개요)
5. [컴포넌트 계층 구조](#컴포넌트-계층-구조)
6. [데이터 흐름](#데이터-흐름)
7. [API 라우트](#api-라우트)
8. [타입 시스템](#타입-시스템)
9. [스타일링 시스템](#스타일링-시스템)
10. [주요 기능](#주요-기능)
11. [알려진 이슈 및 개선 사항](#알려진-이슈-및-개선-사항)

---

## 프로젝트 개요

**AGI TR Gantt Generator**는 TSV/JSON 형식의 작업 데이터를 업로드하여 다중 시나리오 Excel Gantt 차트 워크북을 생성하는 Next.js 기반 웹 애플리케이션입니다.

### 주요 목적
- 프로젝트 일정 데이터(TSV/JSON) 업로드 및 파싱
- 다중 시나리오 Gantt 차트 생성
- Excel 워크북(.xlsx) 다운로드 지원
- 실시간 일정 미리보기 및 시각화

---

## 기술 스택

### 프레임워크 & 런타임
- **Next.js 16.0.10** (App Router)
- **React 19.2.0**
- **TypeScript 5.x**

### UI 라이브러리
- **Radix UI** (Headless UI 컴포넌트)
  - Accordion, Alert Dialog, Dialog, Dropdown Menu, Popover, Select, Tabs, Toast 등
- **shadcn/ui** (컴포넌트 시스템)
- **Tailwind CSS 4.1.9** (스타일링)
- **Lucide React** (아이콘)

### 유틸리티
- **date-fns 4.1.0** (날짜 처리)
- **zod 3.25.76** (스키마 검증)
- **react-hook-form 7.60.0** (폼 관리)
- **clsx & tailwind-merge** (클래스 병합)

### 개발 도구
- **PostCSS** (CSS 처리)
- **Vercel Analytics** (분석)

---

## 디렉토리 구조

```
vecel_agi gantt/
├── app/                          # Next.js App Router
│   ├── api/                      # API 라우트
│   │   ├── download/            # 파일 다운로드 엔드포인트
│   │   │   └── route.ts
│   │   └── generate/            # Gantt 생성 엔드포인트
│   │       └── route.ts
│   ├── globals.css              # 전역 스타일
│   ├── layout.tsx               # 루트 레이아웃
│   └── page.tsx                 # 메인 페이지
│
├── components/                  # React 컴포넌트
│   ├── ui/                      # shadcn/ui 기본 컴포넌트 (40+ 개)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── tabs.tsx
│   │   └── ... (기타 UI 컴포넌트)
│   ├── configuration-panel.tsx # 설정 패널
│   ├── file-uploader.tsx        # 파일 업로드 컴포넌트
│   ├── gantt-generator.tsx      # 메인 Gantt 생성기
│   ├── gantt-preview.tsx        # Gantt 차트 미리보기
│   ├── generation-status.tsx    # 생성 상태 표시
│   └── theme-provider.tsx       # 테마 제공자
│
├── lib/                         # 유틸리티 & 타입
│   ├── file-parser.ts          # 파일 파싱 로직
│   ├── types.ts                 # TypeScript 타입 정의
│   └── utils.ts                 # 유틸리티 함수
│
├── hooks/                       # 커스텀 훅
│   ├── use-mobile.ts           # 모바일 감지
│   └── use-toast.ts            # 토스트 알림
│
├── data/                       # 정적 데이터
│   ├── activity-data.json      # 활동 데이터
│   ├── tide-data.json          # 조수 데이터
│   └── weather-data.json       # 날씨 데이터
│
├── public/                     # 정적 파일
│   ├── icon-*.png              # 아이콘
│   └── sample-tasks.tsv        # 샘플 데이터
│
├── styles/                     # 추가 스타일
│   └── globals.css
│
├── package.json                # 의존성 관리
├── tsconfig.json               # TypeScript 설정
├── next.config.mjs             # Next.js 설정
├── components.json             # shadcn/ui 설정
└── postcss.config.mjs          # PostCSS 설정
```

---

## 아키텍처 개요

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    app/layout.tsx                       │
│              (루트 레이아웃 + 메타데이터)                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    app/page.tsx                        │
│              (메인 페이지 - GanttGenerator)              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            components/gantt-generator.tsx                │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │ FileUploader │ ConfigPanel │ GenStatus    │         │
│  └──────────────┴──────────────┴──────────────┘         │
│                     │                                     │
│  ┌──────────────────▼──────────────────┐                │
│  │      GanttPreview                  │                │
│  │  (Gantt Chart / Table / Voyage)    │                │
│  └─────────────────────────────────────┘                │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌─────────▼──────────┐
│ /api/generate │      │  /api/download    │
│  (POST)       │      │  (GET)             │
└───────────────┘      └───────────────────┘
```

---

## 컴포넌트 계층 구조

### 1. GanttGenerator (최상위 컨테이너)
**위치**: `components/gantt-generator.tsx`

**역할**:
- 전체 애플리케이션 상태 관리
- 파일 업로드, 설정, 생성 상태 통합 관리
- API 호출 및 결과 처리

**주요 상태**:
```typescript
- uploadedFiles: UploadedFile[]
- config: ProjectConfig
- isGenerating: boolean
- result: GenerationResult | null
- error: string | null
- scheduleData: ScheduleData | null
```

**레이아웃 구조**:
```
┌─────────────────────────────────────────┐
│ Header (로고 + 버전)                      │
├─────────────────────────────────────────┤
│ Input Files │ Settings │ Generator      │
│ (3열 그리드)                              │
├─────────────────────────────────────────┤
│         GanttPreview (전체 영역)          │
│  - Gantt Chart Tab                      │
│  - Table View Tab                       │
│  - Voyage Summary Tab                   │
│  - Summary Tab                          │
└─────────────────────────────────────────┘
```

### 2. FileUploader
**위치**: `components/file-uploader.tsx`

**기능**:
- 드래그 앤 드롭 파일 업로드
- TSV/JSON 파일 검증 및 파싱
- 업로드된 파일 목록 표시 및 제거
- Compact 모드 지원

**Props**:
```typescript
interface FileUploaderProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  compact?: boolean
}
```

**파일 검증**:
- 확장자: `.tsv`, `.json`, `.txt`, `.csv`
- 최대 크기: 10MB
- 필수 컬럼: `activityName`, `originalDuration`, `plannedStart`, `plannedFinish`

### 3. ConfigurationPanel
**위치**: `components/configuration-panel.tsx`

**기능**:
- 프로젝트 시작일 설정
- Compact 모드 지원

**Props**:
```typescript
interface ConfigurationPanelProps {
  config: ProjectConfig
  onConfigChange: (config: ProjectConfig) => void
  compact?: boolean
}
```

### 4. GenerationStatus
**위치**: `components/generation-status.tsx`

**기능**:
- 생성 버튼 제공
- 생성 진행 상태 표시
- 에러 메시지 표시
- 다운로드 링크 제공

### 5. GanttPreview
**위치**: `components/gantt-preview.tsx`

**기능**:
- 5가지 탭 뷰 제공:
  1. **Gantt Chart**: 타임라인 기반 Gantt 차트 (Deadline 오버레이 포함)
  2. **Table View**: 테이블 형식 일정
  3. **Voyage Summary**: 항해 마일스톤 및 날씨/조수 정보
  4. **Documents**: Voyage 문서 체크리스트 관리 (하이브리드 레이아웃: 카드/테이블 뷰)
  5. **Summary**: 프로젝트 요약 통계

**주요 기능**:
- 줌 인/아웃 (4단계: 24px, 32px, 48px, 64px)
- 그룹 접기/펼치기
- 고정 데이터 / 업로드 데이터 전환
- 날씨/조수 데이터 통합 표시
- Deadline 오버레이 시각화 (Deadlines 버튼으로 토글)
- **Docs Progress Overlay**: Trip row 위에 문서 진행률 표시 (Approved/Total 비율)
  - 클릭 시 Docs 탭으로 이동 + 해당 Voyage 자동 선택
  - 키보드 접근성 지원 (Tab, Enter/Space)
  - 포커스 링 스타일 (focus-visible)
- Voyage 문서 체크리스트 및 워크플로우 상태 관리
- Trip 그룹별 색상 코딩:
  - AGI TR Units 1-2: Sky
  - AGI TR Units 3-4: Emerald
  - AGLI TR Units 5-6: Amber
  - AGL TR Unit 7: Violet

---

## 데이터 흐름

### 1. 파일 업로드 흐름

```
User Action
    │
    ▼
[FileUploader]
    │
    ├─► validateFileType() ──┐
    │                         │
    └─► parseUploadedFile()   │
           │                  │
           ├─► parseTSV()     │
           │                  │
           └─► parseJSON()    │
                              │
                              ▼
                    [lib/file-parser.ts]
                              │
                              ├─► validateAndTransformTask()
                              │
                              └─► buildTask()
                              │
                              ▼
                    UploadedFile[]
                              │
                              ▼
                    [GanttGenerator State]
```

### 2. 생성 요청 흐름

```
[Generate Button Click]
    │
    ▼
[GanttGenerator.handleGenerate()]
    │
    ├─► FormData 생성
    │   ├─ files (File[])
    │   └─ config (JSON)
    │
    ▼
[POST /api/generate]
    │
    ├─► parseFileContent()
    │   ├─ TSV 파싱
    │   └─ JSON 파싱
    │
    ├─► generateScheduleFromTasks()
    │   ├─ 날짜 계산
    │   ├─ 계층 구조 정렬
    │   └─ ScheduleData 생성
    │
    ▼
[Response JSON]
    │
    ├─ success: boolean
    ├─ downloadUrl: string
    ├─ filename: string
    ├─ scenarioCount: number
    ├─ taskCount: number
    └─ scheduleData: ScheduleData
    │
    ▼
[GanttGenerator State Update]
    │
    ├─► setResult()
    └─► setScheduleData()
    │
    ▼
[GanttPreview 렌더링]
```

### 3. 다운로드 흐름

```
[Download Button Click]
    │
    ▼
[GET /api/download?id=timestamp]
    │
    ├─► generateSampleExcel()
    │   (현재는 샘플 XML 반환)
    │
    ▼
[Excel File Download]
```

---

## API 라우트

### 1. POST /api/generate

**목적**: Gantt 차트 데이터 생성

**요청**:
```typescript
FormData {
  files: File[]           // 업로드된 파일들
  config: string          // JSON.stringify(ProjectConfig)
}
```

**응답**:
```typescript
{
  success: boolean
  downloadUrl: string
  filename: string
  scenarioCount: number
  taskCount: number
  scheduleData: ScheduleData
}
```

**처리 로직**:
1. 파일 파싱 (TSV/JSON)
2. TaskInput 배열 생성
3. ScheduleData 생성 (날짜 계산, 정렬)
4. 다운로드 URL 생성

**에러 처리**:
- 파일 없음: 400
- 파싱 실패: 400
- 설정 오류: 400
- 서버 오류: 500

### 2. GET /api/download

**목적**: 생성된 Excel 파일 다운로드

**쿼리 파라미터**:
- `id`: 파일 식별자 (타임스탬프)

**응답**:
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Excel 파일 스트림

**현재 상태**: 샘플 XML 반환 (프로덕션에서는 Python 스크립트 통합 필요)

---

## 타입 시스템

### 핵심 타입 정의

**위치**: `lib/types.ts`

#### 1. ProjectConfig
```typescript
interface ProjectConfig {
  projectStart: string  // ISO 날짜 문자열
}
```

#### 2. TaskInput (입력 데이터)
```typescript
interface TaskInput {
  activityId1: string      // WBS Level 1
  activityId2: string      // WBS Level 2 (Trip 그룹핑 키)
  activityId3: string      // WBS Level 3
  activityName: string
  originalDuration: number // 일 단위
  plannedStart: string     // ISO 날짜
  plannedFinish: string    // ISO 날짜
  fullActivityId: string   // 계산된 필드
  level: number            // 계층 깊이 (1-3)
}
```

#### 3. ScheduleTask (스케줄 데이터)
```typescript
interface ScheduleTask {
  id: string
  activityId1: string
  activityId2: string
  activityId3: string
  name: string
  duration: number
  startDay?: number        // 프로젝트 시작일 기준 일수
  startDate: string | Date
  endDate: string | Date
  level: number
}
```

#### 4. ScheduleData
```typescript
interface ScheduleData {
  projectName?: string
  generatedAt?: string
  tasks: ScheduleTask[]
  scenarios?: string[]
  summary?: ScheduleSummary
}
```

#### 5. UploadedFile
```typescript
interface UploadedFile {
  name: string
  type: "tsv" | "json"
  file: File
  data: TaskInput[]
  recordCount: number
}
```

#### 6. GenerationResult
```typescript
interface GenerationResult {
  success: boolean
  downloadUrl: string
  filename: string
  scenarioCount: number
  taskCount: number
  scheduleData: ScheduleData
}
```

#### 7. TideRecord & WeatherRecord
```typescript
interface TideRecord {
  date: string
  high_tide_window: string
  max_height_m: number
  risk_level: "LOW" | "MEDIUM" | "HIGH"
}

interface WeatherRecord {
  date: string
  wind_max_kn: number
  gust_max_kn: number
  wind_dir_deg: number
  wave_max_m: number
  visibility_km: number
  risk_level: "LOW" | "MEDIUM" | "HIGH"
  is_shamal: boolean
}
```

---

## 스타일링 시스템

### 테마 설정

**위치**: `app/globals.css`

**특징**:
- **OKLCH 색공간** 사용 (현대적 색상 관리)
- **다크 모드** 완전 지원
- **CSS 변수** 기반 테마 시스템
- **Tailwind CSS 4.x** 통합

### 주요 색상 변수

```css
:root {
  --background: oklch(0.985 0 0)
  --foreground: oklch(0.145 0 0)
  --primary: oklch(0.55 0.15 250)      /* 보라색 계열 */
  --muted: oklch(0.96 0.005 250)
  --border: oklch(0.91 0.005 250)
  --radius: 8px
}
```

### 컴포넌트 스타일링

- **shadcn/ui** 컴포넌트 사용
- **Tailwind CSS** 유틸리티 클래스
- **Compact 모드**: 작은 화면/압축 레이아웃 지원
- **반응형 디자인**: 모바일/데스크톱 대응

---

## 주요 기능

### 1. 파일 파싱

**위치**: `lib/file-parser.ts`

**지원 형식**:
- TSV (탭 구분)
- CSV (쉼표 구분)
- JSON

**컬럼 매핑**:
- 유연한 헤더 인식 (대소문자, 공백, 언더스코어 무시)
- 다양한 컬럼명 변형 지원:
  - `Activity ID (1)` → `activityId1`
  - `WBS Level 1` → `activityId1`
  - `Original Duration` → `originalDuration`
  - 등등...

**검증**:
- 필수 컬럼 확인
- 파일 크기 제한 (10MB)
- 날짜 형식 정규화
- Duration 파싱 (숫자 추출)

### 2. Gantt 차트 렌더링

**특징**:
- **계층적 그룹핑**: Activity ID (2) 기준 Trip 그룹
- **색상 코딩**: 4개 Trip 그룹별 색상
  - AGI TR Units 1-2: Sky
  - AGI TR Units 3-4: Emerald
  - AGLI TR Units 5-6: Amber
  - AGL TR Unit 7: Violet
- **줌 레벨**: 4단계 (24px, 32px, 48px, 64px)
- **접기/펼치기**: 그룹별 토글
- **주말 하이라이트**: 시각적 구분
- **툴팁**: 작업 상세 정보

### 3. Voyage Summary

**마일스톤 추적**:
1. LCT Arrives to MZP
2. Load-out
3. Sail-away to AGI
4. Return to MZP

**통합 데이터**:
- **조수 정보** (tide-data.json)
  - High tide window
  - Max height (m)
  - Risk level
- **날씨 정보** (weather-data.json)
  - Wind speed (kn)
  - Wave height (m)
  - Visibility (km)
  - SHAMAL 경고

### 4. 데이터 소스 전환

- **Fixed Data**: `data/activity-data.json` 사용
- **Uploaded Data**: 사용자 업로드 파일 사용
- 실시간 전환 가능

### 5. Documents 탭 (Voyage 문서 체크리스트)

**위치**: `components/documents/document-checklist.tsx`

**하이브리드 레이아웃**:
- **카드 뷰** (기본): 카테고리별 Card 그룹, 빠른 체크 및 승인 토글
- **테이블 뷰**: 좌측 카테고리 탭 + 우측 문서 테이블, 상세 관리 및 상태 전이

**레이아웃 전환**:
- 상단 우측에 "Card View" / "Table View" 버튼으로 전환
- 기본값: 카드 뷰

**주요 기능**:
- **상태 머신**: `not_started → submitted → approved` 전이
  - Submit 버튼: `not_started` → `submitted`
  - Approve 버튼: `submitted` → `approved`
  - 가드 로직: `canTransition()` 함수로 전이 허용 여부 확인
- **마감일 계산**: Anchor Milestone + Offset Days
  - Anchor: `mzp_arrival`, `loadout_start`, `mzp_departure` 등
  - Offset: 음수(이전) / 양수(이후) 일수
  - 타입: `calendar_days` (주말 포함) / `business_days` (주말 제외)
  - 자동 재계산: 일정 변경 시 마감일 자동 재계산
- **D-카운트다운**: 마감일까지 남은 일수 표시
  - 카드 뷰: Badge로 표시 (D-N, Due today, Overdue Nd)
  - 테이블 뷰: Badge로 표시 + Due State Badge
  - Overdue 시 빨간색 강조
- **Due State**: `on_track` / `at_risk` / `overdue` (색상 Badge)
- **진행률 표시**: 카테고리별 완료율 (Progress bar)
- **History 자동 추가**: 상태 변경 시 자동 기록 (`STATE_${STATUS}` 형식)

**카드 뷰 특징**:
- 카테고리별 Card 그룹 (Accordion 스타일)
- 체크박스로 `approved` 상태 토글
- D-카운트다운 Badge 표시 (Overdue 시 빨간색 강조)
- Due State Badge (On Track/At Risk/Overdue)
- Priority Badge (critical/important/standard/recommended)

**테이블 뷰 특징**:
- 좌측: 카테고리 탭 (Tabs, 진행률 표시: approved/total)
- 우측: 문서 테이블 (Document, Due, Status, Action 컬럼)
- Submit/Approve 버튼으로 상태 전이 (상태 머신 가드 적용)
- D-카운트다운 + Due State Badge
- 카테고리별 필터링

**데이터 소스**:
- `data/doc-templates.json`: 문서 템플릿 정의
- `lib/documents/deadline-engine.ts`: 마감일 계산 엔진
- `lib/documents/workflow.ts`: 상태 전이 로직
- `contexts/voyage-context.tsx`: 문서 상태 관리 (localStorage)

자세한 내용은 [`docs/DOCUMENT_WORKFLOW_GUIDE.md`](./docs/DOCUMENT_WORKFLOW_GUIDE.md) 참조

### 6. Docs Progress Overlay (Gantt Chart 통합)

**위치**: `components/overlays/docs-progress-overlay.tsx`

**기능**:
- Trip group header row 위에 문서 진행률 표시
- Approved/Total 비율 시각화 (Progress bar + Badge)
- 클릭 인터랙션: Docs 탭으로 이동 + 해당 Voyage 자동 선택
- 키보드 접근성: Tab, Enter/Space 지원
- 포커스 링 스타일 (focus-visible)

**통합 위치**:
- Gantt Chart 탭의 Trip group header row
- Voyage 매칭: `tripGroupKey === activityId2`
- 좌표 계산: 기존 Gantt bar와 동일한 로직

**시각적 요소**:
- Progress bar: 초록색 (emerald-500/80)
- Badge: `Docs X/Y` 형식
- 포커스 링: 3px ring, ring-offset-2 (shadcn/ui 일관성)

**접근성**:
- `role="button"` 설정
- `tabIndex={0}` 설정
- `aria-label` 제공
- 키보드 이벤트 핸들러 (`onKeyDown`)
- 포커스 링 스타일 (WCAG 준수)

---

## 설정 파일

### next.config.mjs
```javascript
{
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true }
}
```

### tsconfig.json
- **타겟**: ES6
- **모듈**: ESNext
- **경로 별칭**: `@/*` → `./*`
- **엄격 모드**: 활성화

### components.json (shadcn/ui)
- **스타일**: new-york
- **RSC**: 활성화
- **테마**: CSS 변수 기반
- **아이콘**: Lucide

---

## 알려진 이슈 및 개선 사항

### ⚠️ 현재 제한사항

1. **Excel 생성**: 현재 샘플 XML만 반환 (Python 스크립트 통합 필요)
2. **VBA 매크로**: 미구현
3. **다중 시나리오**: UI는 준비되었으나 백엔드 미구현
4. **타입 불일치**: `app/api/generate/route.ts`에서 `config.scenarios` 참조하지만 `ProjectConfig` 타입에 `scenarios` 필드 없음

### 🔧 권장 통합 방안

1. **Python 스크립트 통합**:
   - Docker 컨테이너
   - 서버리스 함수 (AWS Lambda)
   - Subprocess 실행

2. **파일 저장소**:
   - 임시 파일 시스템
   - S3/클라우드 스토리지
   - Redis 캐싱

3. **실시간 처리**:
   - WebSocket 연결
   - Server-Sent Events
   - 진행률 표시

4. **타입 안전성 개선**:
   - `ProjectConfig`에 `scenarios` 필드 추가 또는
   - API 라우트에서 `scenarios` 참조 제거/수정

---

## 결론

이 시스템은 **Next.js App Router** 기반의 현대적인 웹 애플리케이션으로, **타입 안전성**, **컴포넌트 재사용성**, **확장 가능한 아키텍처**를 갖추고 있습니다. 현재는 프론트엔드가 완성되었으며, 백엔드 Excel 생성 로직 통합이 남아있습니다.

**주요 강점**:
- ✅ 모던 React/Next.js 아키텍처
- ✅ 타입 안전성 (TypeScript)
- ✅ 반응형 UI (Tailwind + shadcn/ui)
- ✅ 유연한 파일 파싱
- ✅ 풍부한 시각화 (Gantt, Table, Summary)

**개선 필요 영역**:
- ⚠️ Excel 생성 백엔드 통합
- ⚠️ 파일 저장소 구현
- ⚠️ 에러 핸들링 강화
- ⚠️ 테스트 코드 추가
- ⚠️ 타입 불일치 수정

---

---

## 관련 문서

- [시스템 아키텍처](./SYSTEM_ARCHITECTURE.md) / [시스템 아키텍처 (한국어)](./SYSTEM_ARCHITECTURE_KO.md) - 기술 아키텍처 문서
- [배포 가이드](./DEPLOYMENT.md) / [배포 가이드 (한국어)](./DEPLOYMENT_KO.md) - 배포 지침

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2025-01-19
