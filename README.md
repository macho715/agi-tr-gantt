# AGI TR Gantt Generator

**Multi-scenario Excel Gantt Chart Workbook Generator Web Application**

[![Next.js](https://img.shields.io/badge/Next.js-16.0.10-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.0-61dafb)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.9-38bdf8)](https://tailwindcss.com/)

## 📋 Overview

AGI TR Gantt Generator is a modern web application for generating professional multi-scenario Gantt chart Excel workbooks from TSV/JSON task data files. The application supports hierarchical Work Breakdown Structure (WBS) with 3-level activity IDs and generates interactive Excel files with VBA automation capabilities.

### Key Features

- 📤 **Multi-format File Upload**: Supports TSV, CSV, and JSON input files
- 📊 **3-Level WBS Hierarchy**: Activity ID (1), (2), (3) for project organization
- 🎯 **Multi-scenario Generation**: Optimistic, Baseline, and Pessimistic scenarios
- 📈 **Interactive Excel Output**: Generated workbooks with VBA macros
- 📋 **Document Management**: Voyage document checklist with hybrid layout (Card/Table views)
- 🔄 **Workflow State Machine**: Status transitions (`not_started → submitted → approved`) with Submit/Approve actions
- 📅 **Deadline Tracking**: Automatic due date calculation with D-countdown display
- 🎨 **Modern UI**: Built with Next.js, React, and Tailwind CSS
- 🌙 **Dark Mode Support**: Automatic theme switching
- ⚡ **Real-time Preview**: Visual Gantt chart preview with 5 tab views before download
- 🔄 **Bulk Processing**: Upload and process multiple files simultaneously

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **pnpm** (recommended) or npm/yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/macho715/agi-tr-gantt.git
cd agi-tr-gantt

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## 📁 Input File Format

### TSV/CSV Format

Your input file must include the following columns (case-insensitive):

| Column Name | Required | Description |
|------------|----------|-------------|
| Activity ID (1) | Optional | WBS Level 1 identifier |
| Activity ID (2) | Optional | WBS Level 2 identifier (used for trip grouping) |
| Activity ID (3) | Optional | WBS Level 3 identifier |
| Activity Name | **Required** | Task/activity description |
| Original Duration | **Required** | Duration in days |
| Planned Start | **Required** | Start date (YYYY-MM-DD) |
| Planned Finish | **Required** | End date (YYYY-MM-DD) |

#### Example TSV

```tsv
Activity ID (1)	Activity ID (2)	Activity ID (3)	Activity Name	Original Duration	Planned Start	Planned Finish
1.0	1.1	1.1.1	Site Preparation	14	2025-02-01	2025-02-15
1.0	1.1	1.1.2	Foundation Work	21	2025-02-16	2025-03-09
1.0	1.2	1.2.1	Material Procurement	30	2025-02-01	2025-03-03
```

### JSON Format

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
      "plannedFinish": "2025-02-15"
    }
  ]
}
```

## 🏗️ Project Structure

```
agi-tr-gantt/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── generate/         # Excel generation endpoint
│   │   └── download/        # File download endpoint
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
├── components/               # React components
│   ├── ui/                   # shadcn/ui components
│   ├── configuration-panel.tsx
│   ├── file-uploader.tsx
│   ├── gantt-generator.tsx
│   ├── gantt-preview.tsx
│   └── generation-status.tsx
├── lib/                      # Utility libraries
│   ├── file-parser.ts        # File parsing logic
│   ├── types.ts              # TypeScript type definitions
│   └── utils.ts              # Helper functions
├── data/                     # Sample data files
│   ├── activity-data.json
│   ├── tide-data.json
│   └── weather-data.json
├── hooks/                    # Custom React hooks
├── public/                   # Static assets
└── styles/                   # Additional stylesheets
```

## 🔧 Configuration

### Project Configuration

- **Project Start Date**: Base date for schedule calculations
- **Scenarios**: Select which scenarios to generate (Optimistic, Baseline, Pessimistic)

### Environment Variables

Create a `.env.local` file for production deployment:

```env
# Python Integration (for Excel generation)
PYTHON_API_URL=https://your-python-api.com/generate
PYTHON_API_KEY=your-api-key

# File Upload Limits
MAX_FILE_SIZE=10485760  # 10MB in bytes
GENERATION_TIMEOUT=60000  # 60 seconds in milliseconds
```

## 📦 API Endpoints

### POST `/api/generate`

Generates Excel workbook from uploaded files.

**Request:**
- `files`: Array of File objects (TSV/JSON)
- `config`: JSON string with project configuration

**Response:**
```json
{
  "success": true,
  "downloadUrl": "/api/download?id=1234567890",
  "filename": "gantt_schedule_2025-01-01.xlsx",
  "scenarioCount": 3,
  "taskCount": 45,
  "scheduleData": { ... }
}
```

### GET `/api/download?id={id}`

Downloads the generated Excel file.

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui
- **Date Handling**: date-fns
- **Charts**: Recharts
- **Icons**: Lucide React
- **Package Manager**: pnpm

## 🧪 Development

```bash
# Run development server with hot reload
pnpm dev

# Run linter
pnpm lint

# Type checking
pnpm type-check  # if configured in package.json
```

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/macho715/agi-tr-gantt)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy!

## 📝 Python Integration

For Excel workbook generation, integrate with a Python backend. See `DEPLOYMENT.md` for integration options:

- Subprocess execution
- Docker container
- Serverless function (AWS Lambda)

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT.md) / [배포 가이드 (한국어)](./DEPLOYMENT_KO.md) - Detailed deployment instructions
- [System Architecture](./SYSTEM_ARCHITECTURE.md) / [시스템 아키텍처 (한국어)](./SYSTEM_ARCHITECTURE_KO.md) - Technical architecture documentation
- [System Layout](./SYSTEM_LAYOUT.md) / [System Layout (English)](./SYSTEM_LAYOUT_EN.md) - Detailed component structure
- [Document Workflow Guide](./docs/DOCUMENT_WORKFLOW_GUIDE.md) - Deadline calculation logic and hybrid layout usage guide

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js and TypeScript**
