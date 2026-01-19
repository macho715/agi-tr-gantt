# System Architecture

**AGI TR Gantt Generator - Technical Architecture Document**

Version: 1.0.0
Last Updated: 2025-01-01

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagrams](#architecture-diagrams)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [API Architecture](#api-architecture)
6. [File Processing Pipeline](#file-processing-pipeline)
7. [State Management](#state-management)
8. [Technology Stack](#technology-stack)
9. [Security Architecture](#security-architecture)
10. [Performance Considerations](#performance-considerations)
11. [Scalability](#scalability)

---

## System Overview

AGI TR Gantt Generator is a client-server web application built on the Next.js framework. The system processes structured task data (TSV/JSON) and generates multi-scenario Excel Gantt chart workbooks.

### Core Objectives

- **Input Processing**: Parse and validate TSV/JSON task files with hierarchical WBS structure
- **Schedule Generation**: Transform task data into schedule scenarios (Optimistic, Baseline, Pessimistic)
- **Excel Output**: Generate interactive Excel workbooks with VBA automation
- **User Experience**: Provide intuitive UI with real-time preview and status feedback

---

## Architecture Diagrams

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Browser"
        UI[Next.js Frontend<br/>React 19 + TypeScript]
        UI --> |User Actions| Upload[File Upload]
        UI --> |User Actions| Config[Configuration Panel]
        UI --> |Display| Preview[Gantt Preview]
    end

    subgraph "Next.js Server"
        API[API Routes<br/>App Router]
        Parser[File Parser<br/>lib/file-parser.ts]
        Scheduler[Schedule Generator<br/>app/api/generate/route.ts]
    end

    subgraph "External Services"
        Python[Python Excel Generator<br/>Optional Integration]
        Storage[File Storage<br/>S3/Filesystem/Redis]
    end

    Upload --> |HTTP POST| API
    Config --> |HTTP POST| API
    API --> Parser
    Parser --> Scheduler
    Scheduler --> |Optional| Python
    Python --> Storage
    Storage --> |Download URL| UI
    Scheduler --> |Schedule Data| Preview
```

### Component Architecture

```mermaid
graph TD
    Root[GanttGenerator<br/>Root Component]

    Root --> FileUpload[FileUploader<br/>- Drag & Drop<br/>- Validation<br/>- Multi-file]
    Root --> ConfigPanel[ConfigurationPanel<br/>- Project Start Date<br/>- Scenario Selection]
    Root --> GenStatus[GenerationStatus<br/>- Generate Button<br/>- Progress Indicator<br/>- Download Link]
    Root --> Preview[GanttPreview<br/>- Visual Chart<br/>- Task Hierarchy<br/>- Timeline View]

    FileUpload --> |Files| Root
    ConfigPanel --> |Config| Root
    GenStatus --> |API Call| Root
    Root --> |Schedule Data| Preview
```

### Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant UI as Frontend UI
    participant API as API Route
    participant Parser as File Parser
    participant Scheduler as Schedule Generator
    participant Python as Python Service
    participant Storage as File Storage

    User->>UI: Upload TSV/JSON files
    UI->>UI: Validate files (client-side)
    User->>UI: Configure project settings
    User->>UI: Click Generate

    UI->>API: POST /api/generate<br/>(FormData: files + config)

    API->>Parser: Parse file content
    Parser->>Parser: Detect format (TSV/JSON)
    Parser->>Parser: Map headers
    Parser->>Parser: Validate data
    Parser-->>API: TaskInput[]

    API->>Scheduler: Generate schedule
    Scheduler->>Scheduler: Calculate dates
    Scheduler->>Scheduler: Build hierarchy
    Scheduler-->>API: ScheduleData

    API->>Python: Generate Excel (optional)
    Python->>Python: Create workbook
    Python->>Python: Add VBA macros
    Python-->>API: Excel Buffer

    API->>Storage: Store file
    Storage-->>API: File ID/URL

    API-->>UI: Response<br/>{downloadUrl, scheduleData}
    UI->>UI: Update preview
    UI->>UI: Show download link

    User->>UI: Click Download
    UI->>API: GET /api/download?id=xxx
    API->>Storage: Retrieve file
    Storage-->>API: File Buffer
    API-->>UI: Excel File
    UI-->>User: Download starts
```

### File Processing Pipeline

```mermaid
flowchart LR
    Input[Input File<br/>TSV/JSON] --> Detect{Detect Format}
    Detect -->|TSV/CSV| TSVParser[TSV Parser]
    Detect -->|JSON| JSONParser[JSON Parser]

    TSVParser --> HeaderMap[Header Mapping<br/>Normalize column names]
    JSONParser --> Validate[Validate Structure]
    HeaderMap --> Validate

    Validate --> Transform[Transform to TaskInput]
    Transform --> Hierarchy[Build WBS Hierarchy<br/>Level 1, 2, 3]
    Hierarchy --> Output[TaskInput[]<br/>Validated Tasks]

    style Input fill:#e1f5ff
    style Output fill:#c8e6c9
```

### API Request Flow

```mermaid
graph LR
    Request[HTTP Request] --> ValidateReq{Validate Request}
    ValidateReq -->|Invalid| Error[400 Bad Request]
    ValidateReq -->|Valid| ParseFiles[Parse Files]

    ParseFiles --> MergeTasks[Merge All Tasks]
    MergeTasks --> ValidateData{Validate Data}
    ValidateData -->|Invalid| Error
    ValidateData -->|Valid| GenerateSchedule[Generate Schedule]

    GenerateSchedule --> CallPython{Call Python?}
    CallPython -->|Yes| PythonGen[Python Generator]
    CallPython -->|No| ReturnData[Return Schedule Data]

    PythonGen --> StoreFile[Store Excel File]
    StoreFile --> ReturnData

    ReturnData --> Success[200 Success Response]

    style Error fill:#ffcdd2
    style Success fill:#c8e6c9
```

---

## Component Architecture

### Frontend Components

#### 1. **GanttGenerator** (Container Component)
- **Location**: `components/gantt-generator.tsx`
- **Responsibility**: Main orchestrator component
- **State Management**:
  - `uploadedFiles`: Array of parsed file data
  - `config`: Project configuration (start date, scenarios)
  - `isGenerating`: Loading state
  - `result`: Generation result with download URL
  - `error`: Error messages
  - `scheduleData`: Parsed schedule for preview

#### 2. **FileUploader**
- **Location**: `components/file-uploader.tsx`
- **Responsibility**: File upload and validation
- **Features**:
  - Drag & drop support
  - Multiple file selection
  - File type validation (TSV/JSON)
  - Size limit enforcement (10MB)
  - Real-time parsing feedback

#### 3. **ConfigurationPanel**
- **Location**: `components/configuration-panel.tsx`
- **Responsibility**: Project settings
- **Configurable**:
  - Project start date
  - Scenario selection (Optimistic, Baseline, Pessimistic)

#### 4. **GanttPreview**
- **Location**: `components/gantt-preview.tsx`
- **Responsibility**: Visual Gantt chart preview
- **Features**:
  - Interactive timeline view (5 tab views: Gantt Chart, Table View, Voyage Summary, Documents, Summary)
  - Task hierarchy visualization
  - Color-coded by WBS level
  - Deadline overlay visualization
  - **Docs Progress Overlay**: Document progress visualization on Trip rows
    - Click interaction: Navigate to Docs tab + auto-select Voyage
    - Keyboard accessibility support (Tab, Enter/Space)
    - Focus ring styling (focus-visible)
  - Responsive design

#### 5. **DocumentChecklist**
- **Location**: `components/documents/document-checklist.tsx`
- **Responsibility**: Voyage document checklist management
- **Features**:
  - Hybrid layout: Card view ↔ Table view toggle
  - Category-based document grouping (Accordion or Tabs)
  - Workflow state machine (`not_started → submitted → approved`)
  - Submit/Approve buttons for status transitions (state machine guard)
  - Due date calculation and Due state display (on_track/at_risk/overdue)
  - D-countdown display (days until due, Card/Table views)
  - Progress tracking (Progress bar, per category)
  - Automatic history logging (on state changes)

#### 6. **DocsProgressOverlay**
- **Location**: `components/overlays/docs-progress-overlay.tsx`
- **Responsibility**: Document progress visualization on Gantt Trip rows
- **Features**:
  - Approved/Total ratio visualization (Progress bar + Badge)
  - Click interaction: Navigate to Docs tab + auto-select Voyage
  - Keyboard accessibility support (Tab, Enter/Space)
  - Focus ring styling (focus-visible)

#### 7. **GenerationStatus**
- **Location**: `components/generation-status.tsx`
- **Responsibility**: Generation control and status
- **Features**:
  - Generate button
  - Progress indicators
  - Success/error messaging
  - Download link

---

## Data Flow

### File Upload Flow

```mermaid
sequenceDiagram
    participant User
    participant Uploader as FileUploader
    participant Parser as File Parser
    participant State as GanttGenerator State

    User->>Uploader: Select/Drop files
    Uploader->>Uploader: Validate file type
    Uploader->>Uploader: Check file size
    Uploader->>Parser: Parse file content
    Parser->>Parser: Detect format
    Parser->>Parser: Map headers
    Parser->>Parser: Transform to TaskInput
    Parser-->>Uploader: TaskInput[]
    Uploader->>State: Update uploadedFiles
    State->>Uploader: Re-render with file list
```

### Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as GanttGenerator
    participant API as /api/generate
    participant Python as Python Service
    participant Storage as File Storage

    User->>UI: Click Generate
    UI->>UI: Set isGenerating = true
    UI->>API: POST /api/generate<br/>(FormData)

    API->>API: Parse FormData
    API->>API: Parse files
    API->>API: Generate schedule
    API->>Python: Generate Excel (optional)
    Python-->>API: Excel Buffer
    API->>Storage: Store file
    Storage-->>API: File ID

    API-->>UI: {downloadUrl, scheduleData}
    UI->>UI: Update state
    UI->>UI: Show preview
    UI->>UI: Show download link
    UI-->>User: Display result
```

---

## API Architecture

### Endpoint: POST `/api/generate`

**Purpose**: Generate Excel workbook from uploaded task files

**Request Flow**:
```mermaid
graph TD
    Start[Receive FormData] --> Extract[Extract files & config]
    Extract --> Parse[Parse each file]
    Parse --> Merge[Merge all tasks]
    Merge --> Validate{Validate}
    Validate -->|Fail| Error[Return 400]
    Validate -->|Pass| Schedule[Generate Schedule]
    Schedule --> Python{Call Python?}
    Python -->|Yes| GenExcel[Generate Excel]
    Python -->|No| Return[Return Schedule Data]
    GenExcel --> Store[Store File]
    Store --> Return
    Return --> Success[Return 200]
```

**Response Structure**:
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

### Endpoint: GET `/api/download?id={id}`

**Purpose**: Download generated Excel file

**Flow**:
```mermaid
graph LR
    Request[GET Request] --> Validate{Valid ID?}
    Validate -->|No| Error[404 Not Found]
    Validate -->|Yes| Retrieve[Retrieve from Storage]
    Retrieve -->|Not Found| Error
    Retrieve -->|Found| Stream[Stream File]
    Stream --> Success[200 OK]
```

---

## File Processing Pipeline

### Parser Architecture

```mermaid
graph TD
    Input[File Content<br/>String] --> Format{Detect Format}

    Format -->|TSV/CSV| TSV[TSV Parser]
    Format -->|JSON| JSON[JSON Parser]

    TSV --> Header[Header Detection<br/>Delimiter Detection]
    Header --> Map[Header Mapping<br/>Normalize Names]

    JSON --> ValidateJSON[Validate Structure]

    Map --> Transform[Row Processing]
    ValidateJSON --> Transform

    Transform --> Build[Build Task Objects]
    Build --> ValidateTask[Validate Required Fields]
    ValidateTask --> Output[TaskInput[]]

    style Input fill:#e1f5ff
    style Output fill:#c8e6c9
```

### Header Mapping System

The system uses a flexible header mapping to handle various column name formats:

```mermaid
graph LR
    RawHeader[Raw Header<br/>e.g., 'Activity ID (1)'] --> Normalize[Normalize<br/>Lowercase, Trim]
    Normalize --> Lookup[Lookup in<br/>COLUMN_MAPPINGS]
    Lookup --> Mapped[Mapped Field<br/>e.g., 'activityId1']
    Mapped --> TaskField[TaskInput Field]

    style RawHeader fill:#fff3e0
    style TaskField fill:#c8e6c9
```

---

## State Management

### Client-Side State (React)

```mermaid
graph TD
    Root[GanttGenerator<br/>Root State] --> Files[uploadedFiles<br/>UploadedFile[]]
    Root --> Config[config<br/>ProjectConfig]
    Root --> Generating[isGenerating<br/>boolean]
    Root --> Result[result<br/>GenerationResult | null]
    Root --> Error[error<br/>string | null]
    Root --> Schedule[scheduleData<br/>ScheduleData | null]

    Files --> FileUploader[FileUploader Component]
    Config --> ConfigPanel[ConfigurationPanel Component]
    Generating --> GenStatus[GenerationStatus Component]
    Result --> GenStatus
    Error --> GenStatus
    Schedule --> Preview[GanttPreview Component]
```

### Server-Side State

- **Stateless**: API routes are stateless (no server-side state)
- **File Storage**: Generated Excel files stored temporarily (in-memory, filesystem, or cloud storage)
- **Session Management**: File download IDs are ephemeral (timestamp-based)

---

## Technology Stack

### Frontend

```mermaid
graph TB
    Framework[Next.js 16<br/>App Router] --> React[React 19]
    Framework --> TypeScript[TypeScript 5]
    Framework --> Tailwind[Tailwind CSS 4]

    React --> UI[Radix UI<br/>shadcn/ui]
    React --> Charts[Recharts]
    React --> Icons[Lucide React]

    TypeScript --> Types[Type Definitions<br/>lib/types.ts]

    style Framework fill:#0070f3
    style React fill:#61dafb
    style TypeScript fill:#3178c6
```

### Backend

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Node.js 18+
- **API**: Next.js API Routes
- **File Processing**: Custom parsers (lib/file-parser.ts)

---

## Security Architecture

### Input Validation Flow

```mermaid
graph TD
    Input[User Input] --> TypeCheck{File Type<br/>Whitelist}
    TypeCheck -->|Invalid| Reject1[Reject]
    TypeCheck -->|Valid| SizeCheck{File Size<br/>< 10MB}
    SizeCheck -->|Too Large| Reject2[Reject]
    SizeCheck -->|OK| Parse[Parse Content]
    Parse --> Validate{Validate Data}
    Validate -->|Invalid| Reject3[Reject]
    Validate -->|Valid| Process[Process]

    style Reject1 fill:#ffcdd2
    style Reject2 fill:#ffcdd2
    style Reject3 fill:#ffcdd2
    style Process fill:#c8e6c9
```

### Security Layers

1. **Client-Side Validation**: Immediate feedback
2. **Server-Side Validation**: Final security check
3. **File Type Whitelist**: Only TSV/JSON allowed
4. **Size Limits**: 10MB maximum
5. **Content Sanitization**: Input field validation

---

## Performance Considerations

### Optimization Strategies

```mermaid
graph TD
    Perf[Performance] --> CodeSplit[Code Splitting<br/>Next.js Automatic]
    Perf --> LazyLoad[Lazy Loading<br/>Components]
    Perf --> Memo[React Memoization<br/>useMemo, useCallback]
    Perf --> Async[Async Processing<br/>File Parsing]

    CodeSplit --> Bundle[Smaller Bundles]
    LazyLoad --> Faster[Faster Initial Load]
    Memo --> ReRender[Reduced Re-renders]
    Async --> UX[Better UX]
```

### Caching Strategy

- **Static Assets**: CDN caching
- **API Responses**: No caching (dynamic content)
- **Generated Files**: Temporary storage with TTL

---

## Scalability

### Current Architecture

```mermaid
graph TB
    Users[Users] --> LB[Load Balancer]
    LB --> App1[Next.js Instance 1]
    LB --> App2[Next.js Instance 2]
    LB --> App3[Next.js Instance N]

    App1 --> Storage[Shared Storage<br/>S3/Redis]
    App2 --> Storage
    App3 --> Storage

    App1 --> Python[Python Service<br/>Docker/Lambda]
    App2 --> Python
    App3 --> Python
```

### Scaling Strategies

1. **Horizontal Scaling**: Multiple Next.js instances
2. **Stateless API**: Easy to scale
3. **External Services**: Python service can scale independently
4. **File Storage**: Cloud storage (S3) for scalability

---

## Future Enhancements

### Planned Features

#### Phase 1 (Active)
- ✅ Python Integration
- ✅ File Storage
- ✅ Download Endpoint

#### Phase 2 (Planned)
- 📋 User Authentication
- 📋 Saved Projects
- 📋 Generation History

#### Phase 3 (Future)
- 🔮 Task Dependencies
- 🔮 Resource Allocation
- 🔮 Critical Path

#### Phase 4 (Future)
- 🔮 Custom Templates
- 🔮 Advanced Charts
- 🔮 API Documentation
```

---

## Related Documentation

- [System Layout](./SYSTEM_LAYOUT.md) / [System Layout (English)](./SYSTEM_LAYOUT_EN.md) - Component hierarchy and UI layout details
- [Deployment Guide](./DEPLOYMENT.md) / [배포 가이드 (한국어)](./DEPLOYMENT_KO.md) - Deployment instructions

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-01
**Maintainer**: Development Team
