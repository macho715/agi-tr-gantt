# AGI TR Gantt Generator

**다중 시나리오 Excel Gantt 차트 워크북 생성 웹 애플리케이션**

[![Next.js](https://img.shields.io/badge/Next.js-16.0.10-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.0-61dafb)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.9-38bdf8)](https://tailwindcss.com/)

## 📋 개요

AGI TR Gantt Generator는 TSV/JSON 작업 데이터 파일로부터 전문적인 다중 시나리오 Excel Gantt 차트 워크북을 생성하는 현대적인 웹 애플리케이션입니다. 3단계 Activity ID를 가진 계층적 작업 분해 구조(WBS)를 지원하며, VBA 자동화 기능이 포함된 대화형 Excel 파일을 생성합니다.

### 주요 기능

- 📤 **다중 형식 파일 업로드**: TSV, CSV, JSON 입력 파일 지원
- 📊 **3단계 WBS 계층 구조**: 프로젝트 조직을 위한 Activity ID (1), (2), (3)
- 🎯 **다중 시나리오 생성**: 낙관적, 기준선, 비관적 시나리오
- 📈 **대화형 Excel 출력**: VBA 매크로가 포함된 생성된 워크북
- 🎨 **현대적 UI**: Next.js, React, Tailwind CSS로 구축
- 🌙 **다크 모드 지원**: 자동 테마 전환
- ⚡ **실시간 미리보기**: 다운로드 전 시각적 Gantt 차트 미리보기
- 🔄 **일괄 처리**: 여러 파일을 동시에 업로드 및 처리

## 🚀 빠른 시작

### 사전 요구사항

- **Node.js** 18.0 이상
- **pnpm** (권장) 또는 npm/yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/macho715/agi-tr-gantt.git
cd agi-tr-gantt

# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

### 프로덕션 빌드

```bash
# 프로덕션 빌드
pnpm build

# 프로덕션 서버 시작
pnpm start
```

## 📁 입력 파일 형식

### TSV/CSV 형식

입력 파일에는 다음 컬럼이 포함되어야 합니다 (대소문자 구분 없음):

| 컬럼 이름 | 필수 | 설명 |
|------------|----------|-------------|
| Activity ID (1) | 선택 | WBS Level 1 식별자 |
| Activity ID (2) | 선택 | WBS Level 2 식별자 (트립 그룹핑에 사용) |
| Activity ID (3) | 선택 | WBS Level 3 식별자 |
| Activity Name | **필수** | 작업/활동 설명 |
| Original Duration | **필수** | 기간 (일 단위) |
| Planned Start | **필수** | 시작일 (YYYY-MM-DD) |
| Planned Finish | **필수** | 종료일 (YYYY-MM-DD) |

#### TSV 예시

```tsv
Activity ID (1)	Activity ID (2)	Activity ID (3)	Activity Name	Original Duration	Planned Start	Planned Finish
1.0	1.1	1.1.1	현장 준비	14	2025-02-01	2025-02-15
1.0	1.1	1.1.2	기초 공사	21	2025-02-16	2025-03-09
1.0	1.2	1.2.1	자재 조달	30	2025-02-01	2025-03-03
```

### JSON 형식

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
      "plannedFinish": "2025-02-15"
    }
  ]
}
```

## 🏗️ 프로젝트 구조

```
agi-tr-gantt/
├── app/                      # Next.js App Router
│   ├── api/                  # API 라우트
│   │   ├── generate/         # Excel 생성 엔드포인트
│   │   └── download/        # 파일 다운로드 엔드포인트
│   ├── layout.tsx            # 루트 레이아웃
│   ├── page.tsx              # 홈 페이지
│   └── globals.css           # 전역 스타일
├── components/               # React 컴포넌트
│   ├── ui/                   # shadcn/ui 컴포넌트
│   ├── configuration-panel.tsx
│   ├── file-uploader.tsx
│   ├── gantt-generator.tsx
│   ├── gantt-preview.tsx
│   └── generation-status.tsx
├── lib/                      # 유틸리티 라이브러리
│   ├── file-parser.ts        # 파일 파싱 로직
│   ├── types.ts              # TypeScript 타입 정의
│   └── utils.ts              # 헬퍼 함수
├── data/                     # 샘플 데이터 파일
│   ├── activity-data.json
│   ├── tide-data.json
│   └── weather-data.json
├── hooks/                    # 커스텀 React 훅
├── public/                   # 정적 자산
└── styles/                   # 추가 스타일시트
```

## 🔧 설정

### 프로젝트 설정

- **프로젝트 시작일**: 일정 계산의 기준 날짜
- **시나리오**: 생성할 시나리오 선택 (낙관적, 기준선, 비관적)

### 환경 변수

프로덕션 배포를 위해 `.env.local` 파일 생성:

```env
# Excel 생성을 위한 Python 통합
PYTHON_API_URL=https://your-python-api.com/generate
PYTHON_API_KEY=your-api-key

# 파일 업로드 제한
MAX_FILE_SIZE=10485760  # 10MB (바이트)
GENERATION_TIMEOUT=60000  # 60초 (밀리초)
```

## 📦 API 엔드포인트

### POST `/api/generate`

업로드된 파일로부터 Excel 워크북을 생성합니다.

**요청:**
- `files`: File 객체 배열 (TSV/JSON)
- `config`: 프로젝트 설정이 포함된 JSON 문자열

**응답:**
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

생성된 Excel 파일을 다운로드합니다.

## 🛠️ 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **UI 라이브러리**: React 19
- **언어**: TypeScript 5
- **스타일링**: Tailwind CSS 4
- **UI 컴포넌트**: Radix UI + shadcn/ui
- **날짜 처리**: date-fns
- **차트**: Recharts
- **아이콘**: Lucide React
- **패키지 관리자**: pnpm

## 🧪 개발

```bash
# 핫 리로드와 함께 개발 서버 실행
pnpm dev

# 린터 실행
pnpm lint

# 타입 체크
pnpm type-check  # package.json에 구성된 경우
```

## 🚢 배포

자세한 배포 지침은 [DEPLOYMENT.md](./DEPLOYMENT.md) 또는 [DEPLOYMENT_KO.md](./DEPLOYMENT_KO.md)를 참조하세요.

### Vercel (권장)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/macho715/agi-tr-gantt)

1. 코드를 GitHub에 푸시
2. Vercel에서 프로젝트 가져오기
3. 환경 변수 구성
4. 배포!

## 📝 Python 통합

Excel 워크북 생성을 위해 Python 백엔드와 통합합니다. 통합 옵션은 `DEPLOYMENT.md` 또는 `DEPLOYMENT_KO.md`를 참조하세요:

- Subprocess 실행
- Docker 컨테이너
- 서버리스 함수 (AWS Lambda)

## 📚 문서

- [배포 가이드](./DEPLOYMENT.md) / [배포 가이드 (한국어)](./DEPLOYMENT_KO.md) - 상세한 배포 지침
- [시스템 아키텍처](./SYSTEM_ARCHITECTURE.md) / [시스템 아키텍처 (한국어)](./SYSTEM_ARCHITECTURE_KO.md) - 기술 아키텍처 문서
- [시스템 레이아웃](./SYSTEM_LAYOUT.md) / [시스템 레이아웃 (영어)](./SYSTEM_LAYOUT_EN.md) - 상세 컴포넌트 구조

## 🤝 기여

기여를 환영합니다! Pull Request를 자유롭게 제출해주세요.

## 📄 라이선스

이 프로젝트는 사적이고 독점적입니다.

## 📞 지원

문제 및 질문은 GitHub에 이슈를 열어주세요.

---

**Next.js와 TypeScript로 ❤️를 담아 제작되었습니다**
