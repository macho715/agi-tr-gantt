# AGI TR Gantt Generator

**Multi-scenario Excel Gantt Chart Workbook Generator Web Application**

[![Next.js](https://img.shields.io/badge/Next.js-16.0.10-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.0-61dafb)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.9-38bdf8)](https://tailwindcss.com/)

## 📋 Overview

AGI TR Gantt Generator is a modern web application for generating professional multi-scenario Gantt chart Excel workbooks from TSV/JSON task data files. The application supports hierarchical Work Breakdown Structure (WBS) with 3-level activity IDs and generates interactive Excel files with VBA automation capabilities.

## 🇰🇷 한국어 문서

이 프로젝트의 주요 문서는 한국어로 제공됩니다.

- **[README (한국어)](./README_KO.md)** - 프로젝트 개요 및 빠른 시작
- **[시스템 아키텍처](./SYSTEM_ARCHITECTURE_KO.md)** - 기술 아키텍처 문서
- **[시스템 레이아웃](./SYSTEM_LAYOUT.md)** - 컴포넌트 구조 및 UI 레이아웃
- **[배포 가이드](./DEPLOYMENT_KO.md)** - 상세한 배포 지침

## 📚 English Documentation

English documentation is available in the `docs/en/` directory:

- **[README (English)](./docs/en/README.md)** - Project overview and quick start
- **[System Architecture](./docs/en/SYSTEM_ARCHITECTURE.md)** - Technical architecture documentation
- **[System Layout](./docs/en/SYSTEM_LAYOUT_EN.md)** - Component structure and UI layout
- **[Deployment Guide](./docs/en/DEPLOYMENT.md)** - Detailed deployment instructions
- **[Document Workflow Guide](./docs/DOCUMENT_WORKFLOW_GUIDE.md)** - Deadline calculation logic and hybrid layout usage guide

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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

---

**Built with ❤️ using Next.js and TypeScript**
