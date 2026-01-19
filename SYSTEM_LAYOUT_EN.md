# System Layout Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Architecture Overview](#architecture-overview)
5. [Component Hierarchy](#component-hierarchy)
6. [Data Flow](#data-flow)
7. [API Routes](#api-routes)
8. [Type System](#type-system)
9. [Styling System](#styling-system)
10. [Key Features](#key-features)
11. [Known Issues and Improvements](#known-issues-and-improvements)

---

## Project Overview

**AGI TR Gantt Generator** is a Next.js-based web application that uploads task data in TSV/JSON format and generates multi-scenario Excel Gantt chart workbooks.

### Main Objectives
- Upload and parse project schedule data (TSV/JSON)
- Generate multi-scenario Gantt charts
- Support Excel workbook (.xlsx) download
- Real-time schedule preview and visualization

---

## Technology Stack

### Framework & Runtime
- **Next.js 16.0.10** (App Router)
- **React 19.2.0**
- **TypeScript 5.x**

### UI Libraries
- **Radix UI** (Headless UI components)
  - Accordion, Alert Dialog, Dialog, Dropdown Menu, Popover, Select, Tabs, Toast, etc.
- **shadcn/ui** (Component system)
- **Tailwind CSS 4.1.9** (Styling)
- **Lucide React** (Icons)

### Utilities
- **date-fns 4.1.0** (Date handling)
- **zod 3.25.76** (Schema validation)
- **react-hook-form 7.60.0** (Form management)
- **clsx & tailwind-merge** (Class merging)

### Development Tools
- **PostCSS** (CSS processing)
- **Vercel Analytics** (Analytics)

---

## Directory Structure

```
vecel_agi gantt/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── download/            # File download endpoint
│   │   │   └── route.ts
│   │   └── generate/            # Gantt generation endpoint
│   │       └── route.ts
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main page
│
├── components/                  # React components
│   ├── ui/                      # shadcn/ui base components (40+)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── tabs.tsx
│   │   └── ... (other UI components)
│   ├── configuration-panel.tsx # Configuration panel
│   ├── file-uploader.tsx        # File upload component
│   ├── gantt-generator.tsx      # Main Gantt generator
│   ├── gantt-preview.tsx        # Gantt chart preview
│   ├── generation-status.tsx    # Generation status display
│   └── theme-provider.tsx       # Theme provider
│
├── lib/                         # Utilities & Types
│   ├── file-parser.ts          # File parsing logic
│   ├── types.ts                 # TypeScript type definitions
│   └── utils.ts                 # Utility functions
│
├── hooks/                       # Custom hooks
│   ├── use-mobile.ts           # Mobile detection
│   └── use-toast.ts            # Toast notifications
│
├── data/                       # Static data
│   ├── activity-data.json      # Activity data
│   ├── tide-data.json          # Tide data
│   └── weather-data.json       # Weather data
│
├── public/                     # Static files
│   ├── icon-*.png              # Icons
│   └── sample-tasks.tsv        # Sample data
│
├── styles/                     # Additional styles
│   └── globals.css
│
├── package.json                # Dependency management
├── tsconfig.json               # TypeScript configuration
├── next.config.mjs             # Next.js configuration
├── components.json             # shadcn/ui configuration
└── postcss.config.mjs          # PostCSS configuration
```

---

## Architecture Overview

### Overall Structure

```
┌─────────────────────────────────────────────────────────┐
│                    app/layout.tsx                       │
│              (Root Layout + Metadata)                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    app/page.tsx                        │
│              (Main Page - GanttGenerator)                │
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

## Component Hierarchy

### 1. GanttGenerator (Top-level Container)
**Location**: `components/gantt-generator.tsx`

**Role**:
- Manages overall application state
- Integrates file upload, configuration, and generation status
- Handles API calls and result processing

**Key State**:
```typescript
- uploadedFiles: UploadedFile[]
- config: ProjectConfig
- isGenerating: boolean
- result: GenerationResult | null
- error: string | null
- scheduleData: ScheduleData | null
```

**Layout Structure**:
```
┌─────────────────────────────────────────┐
│ Header (Logo + Version)                  │
├─────────────────────────────────────────┤
│ Input Files │ Settings │ Generator       │
│ (3-column grid)                          │
├─────────────────────────────────────────┤
│         GanttPreview (Full Area)         │
│  - Gantt Chart Tab                      │
│  - Table View Tab                       │
│  - Voyage Summary Tab                   │
│  - Summary Tab                          │
└─────────────────────────────────────────┘
```

### 2. FileUploader
**Location**: `components/file-uploader.tsx`

**Features**:
- Drag & drop file upload
- TSV/JSON file validation and parsing
- Display and remove uploaded file list
- Compact mode support

**Props**:
```typescript
interface FileUploaderProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  compact?: boolean
}
```

**File Validation**:
- Extensions: `.tsv`, `.json`, `.txt`, `.csv`
- Maximum size: 10MB
- Required columns: `activityName`, `originalDuration`, `plannedStart`, `plannedFinish`

### 3. ConfigurationPanel
**Location**: `components/configuration-panel.tsx`

**Features**:
- Project start date setting
- Compact mode support

**Props**:
```typescript
interface ConfigurationPanelProps {
  config: ProjectConfig
  onConfigChange: (config: ProjectConfig) => void
  compact?: boolean
}
```

### 4. GenerationStatus
**Location**: `components/generation-status.tsx`

**Features**:
- Generate button
- Generation progress display
- Error message display
- Download link

### 5. GanttPreview
**Location**: `components/gantt-preview.tsx`

**Features**:
- 5 tab views:
  1. **Gantt Chart**: Timeline-based Gantt chart with Deadline overlay
  2. **Table View**: Table format schedule
  3. **Voyage Summary**: Voyage milestones and weather/tide information
  4. **Documents**: Voyage documents management with checklist and deadline tracking
  5. **Summary**: Project summary statistics

**Key Features**:
- Zoom in/out (4 levels: 24px, 32px, 48px, 64px)
- Group collapse/expand
- Fixed data / Uploaded data toggle
- Weather/tide data integration display
- Deadline overlay visualization (toggle with "Deadlines" button)
- **Docs Progress Overlay**: Document progress indicator on Trip rows
  - Shows Approved/Total ratio (Progress bar + Badge)
  - Click to navigate to Docs tab + auto-select Voyage
  - Keyboard accessibility (Tab, Enter/Space)
  - Focus ring styling (focus-visible)
- Voyage documents checklist with workflow states
- Trip group color coding:
  - AGI TR Units 1-2: Sky
  - AGI TR Units 3-4: Emerald
  - AGLI TR Units 5-6: Amber
  - AGL TR Unit 7: Violet

---

## Data Flow

### 1. File Upload Flow

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

### 2. Generation Request Flow

```
[Generate Button Click]
    │
    ▼
[GanttGenerator.handleGenerate()]
    │
    ├─► FormData Creation
    │   ├─ files (File[])
    │   └─ config (JSON)
    │
    ▼
[POST /api/generate]
    │
    ├─► parseFileContent()
    │   ├─ TSV parsing
    │   └─ JSON parsing
    │
    ├─► generateScheduleFromTasks()
    │   ├─ Date calculation
    │   ├─ Hierarchy sorting
    │   └─ ScheduleData creation
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
[GanttPreview Rendering]
```

### 3. Download Flow

```
[Download Button Click]
    │
    ▼
[GET /api/download?id=timestamp]
    │
    ├─► generateSampleExcel()
    │   (Currently returns sample XML)
    │
    ▼
[Excel File Download]
```

---

## API Routes

### 1. POST /api/generate

**Purpose**: Generate Gantt chart data

**Request**:
```typescript
FormData {
  files: File[]           // Uploaded files
  config: string          // JSON.stringify(ProjectConfig)
}
```

**Response**:
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

**Processing Logic**:
1. File parsing (TSV/JSON)
2. TaskInput array creation
3. ScheduleData creation (date calculation, sorting)
4. Download URL generation

**Error Handling**:
- No files: 400
- Parse failure: 400
- Configuration error: 400
- Server error: 500

### 2. GET /api/download

**Purpose**: Download generated Excel file

**Query Parameters**:
- `id`: File identifier (timestamp)

**Response**:
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Excel file stream

**Current Status**: Returns sample XML (Python script integration required for production)

---

## Type System

### Core Type Definitions

**Location**: `lib/types.ts`

#### 1. ProjectConfig
```typescript
interface ProjectConfig {
  projectStart: string  // ISO date string
}
```

#### 2. TaskInput (Input Data)
```typescript
interface TaskInput {
  activityId1: string      // WBS Level 1
  activityId2: string      // WBS Level 2 (Trip grouping key)
  activityId3: string      // WBS Level 3
  activityName: string
  originalDuration: number // Days
  plannedStart: string     // ISO date
  plannedFinish: string    // ISO date
  fullActivityId: string   // Computed field
  level: number            // Hierarchy depth (1-3)
}
```

#### 3. ScheduleTask (Schedule Data)
```typescript
interface ScheduleTask {
  id: string
  activityId1: string
  activityId2: string
  activityId3: string
  name: string
  duration: number
  startDay?: number        // Days from project start
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

## Styling System

### Theme Configuration

**Location**: `app/globals.css`

**Features**:
- **OKLCH color space** (Modern color management)
- **Dark mode** fully supported
- **CSS variables** based theme system
- **Tailwind CSS 4.x** integration

### Key Color Variables

```css
:root {
  --background: oklch(0.985 0 0)
  --foreground: oklch(0.145 0 0)
  --primary: oklch(0.55 0.15 250)      /* Purple tone */
  --muted: oklch(0.96 0.005 250)
  --border: oklch(0.91 0.005 250)
  --radius: 8px
}
```

### Component Styling

- **shadcn/ui** components
- **Tailwind CSS** utility classes
- **Compact mode**: Support for small screens/compressed layouts
- **Responsive design**: Mobile/desktop support

---

## Key Features

### 1. File Parsing

**Location**: `lib/file-parser.ts`

**Supported Formats**:
- TSV (Tab-separated)
- CSV (Comma-separated)
- JSON

**Column Mapping**:
- Flexible header recognition (case, space, underscore insensitive)
- Support for various column name variations:
  - `Activity ID (1)` → `activityId1`
  - `WBS Level 1` → `activityId1`
  - `Original Duration` → `originalDuration`
  - etc...

**Validation**:
- Required column check
- File size limit (10MB)
- Date format normalization
- Duration parsing (number extraction)

### 2. Gantt Chart Rendering

**Features**:
- **Hierarchical Grouping**: Trip groups based on Activity ID (2)
- **Color Coding**: 4 Trip groups with distinct colors
  - AGI TR Units 1-2: Sky
  - AGI TR Units 3-4: Emerald
  - AGLI TR Units 5-6: Amber
  - AGL TR Unit 7: Violet
- **Zoom Levels**: 4 stages (24px, 32px, 48px, 64px)
- **Collapse/Expand**: Group toggle
- **Weekend Highlight**: Visual distinction
- **Tooltips**: Task detail information

### 3. Voyage Summary

**Milestone Tracking**:
1. LCT Arrives to MZP
2. Load-out
3. Sail-away to AGI
4. Return to MZP

**Integrated Data**:
- **Tide Information** (tide-data.json)
  - High tide window
  - Max height (m)
  - Risk level
- **Weather Information** (weather-data.json)
  - Wind speed (kn)
  - Wave height (m)
  - Visibility (km)
  - SHAMAL warning

### 4. Data Source Toggle

- **Fixed Data**: Uses `data/activity-data.json`
- **Uploaded Data**: Uses user uploaded files
- Real-time toggle available

---

## Configuration Files

### next.config.mjs
```javascript
{
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true }
}
```

### tsconfig.json
- **Target**: ES6
- **Module**: ESNext
- **Path Alias**: `@/*` → `./*`
- **Strict Mode**: Enabled

### components.json (shadcn/ui)
- **Style**: new-york
- **RSC**: Enabled
- **Theme**: CSS variable based
- **Icons**: Lucide

---

## Known Issues and Improvements

### ⚠️ Current Limitations

1. **Excel Generation**: Currently returns sample XML only (Python script integration required)
2. **VBA Macros**: Not implemented
3. **Multi-scenario**: UI is ready but backend not implemented
4. **Type Mismatch**: `app/api/generate/route.ts` references `config.scenarios` but `ProjectConfig` type doesn't have `scenarios` field

### 🔧 Recommended Integration Approaches

1. **Python Script Integration**:
   - Docker container
   - Serverless function (AWS Lambda)
   - Subprocess execution

2. **File Storage**:
   - Temporary filesystem
   - S3/Cloud storage
   - Redis caching

3. **Real-time Processing**:
   - WebSocket connection
   - Server-Sent Events
   - Progress display

4. **Type Safety Improvement**:
   - Add `scenarios` field to `ProjectConfig` or
   - Remove/modify `scenarios` reference in API route

---

## Conclusion

This system is a modern web application based on **Next.js App Router** with **type safety**, **component reusability**, and **scalable architecture**. Currently, the frontend is complete, and backend Excel generation logic integration remains.

**Key Strengths**:
- ✅ Modern React/Next.js architecture
- ✅ Type safety (TypeScript)
- ✅ Responsive UI (Tailwind + shadcn/ui)
- ✅ Flexible file parsing
- ✅ Rich visualization (Gantt, Table, Summary)

**Areas for Improvement**:
- ⚠️ Excel generation backend integration
- ⚠️ File storage implementation
- ⚠️ Enhanced error handling
- ⚠️ Test code addition
- ⚠️ Type mismatch fixes

---

---

## Related Documentation

- [System Architecture](./SYSTEM_ARCHITECTURE.md) / [시스템 아키텍처 (한국어)](./SYSTEM_ARCHITECTURE_KO.md) - Technical architecture documentation
- [Deployment Guide](./DEPLOYMENT.md) / [배포 가이드 (한국어)](./DEPLOYMENT_KO.md) - Deployment instructions

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-19
