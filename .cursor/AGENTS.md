# AGENTS.md

## 0) 목적 (Renovation 운영 지침)
본 저장소는 **Vercel 배포(Next.js App Router)** 기반의 기존 **Gantt 대시보드**를 리뉴얼하여, 정적 HTML(운영/서류) 대시보드를 흡수한 **통합형 Control Tower 대시보드**로 확장한다.  
에이전트(Claude/Cursor/Codex 등)는 아래 규칙을 준수하여 **하드코딩 없이(설정/스키마 기반)** 기능을 추가·변경한다.

---

## 1) SSOT(단일 진실원) & 절대 원칙

### 1.1 SSOT
- **일정 SSOT**: `ScheduleData` (업로드 TSV/JSON → 파싱 → 생성 → Preview)
- **서류 SSOT**: `DocRule JSON` + `DocStatus(상태/증빙)`
- **조수/날씨 SSOT**: `data/tide-data.json`, `data/weather-data.json` 또는 후속 데이터 소스 어댑터

### 1.2 절대 원칙
1) **하드코딩 금지**: 화면/로직/데이터는 모두 `config + schema + adapter`로 유연하게 확장
2) **스키마 우선**: 데이터 계약(TypeScript type + `zod`)을 먼저 고정하고 UI는 그 뒤에 붙인다
3) **작은 변경**: 작은 PR, 작은 diff, 기능별 단계적 릴리스
4) **Vercel 친화**: Functions 번들/런타임 제약을 전제로 설계(아래 2장)

---

## 2) Vercel/Next.js 운영 제약 (반드시 준수)

### 2.1 Vercel Functions 번들 크기
- Vercel Functions는 **unzipped 250MB** 제한이 있으며(레이어 포함), 초과 시 배포 실패 가능.
- 대용량 라이브러리(Python 런타임 포함) 또는 Excel 생성기 전체를 Functions 번들에 직접 포함하지 않는다.

### 2.2 생성 파일 저장/다운로드
- 런타임에서 생성된 `.xlsx` 같은 산출물은 **로컬 파일시스템 의존 금지**를 원칙으로 한다.
- 저장소는 1차로 **Vercel Blob(또는 S3 등 객체스토리지)** 를 사용하고, `/api/download`는 Blob URL 또는 프록시 스트리밍으로 제공한다.

### 2.3 성능/번들 최적화
- 무거운 뷰(Gantt 등)는 `next/dynamic`을 사용해 **지연 로딩**하고, 브라우저 의존 컴포넌트는 `ssr:false`를 적극 활용한다.

---

## 3) 리뉴얼 목표(통합 Control Tower) — 구현 기준

### 3.1 IA(권장 기본안: 사이드바 멀티뷰)
- Program (전체)
- Schedule (Gantt)
- Documents (체크리스트)
- Voyages (카드/요약)
- Operations (병렬/SPMT)
- Tide & Weather

### 3.2 시그니처 인터랙션(최소 2개)
1) **Deadline Ladder**: Gantt 위에 서류 마감 마커 오버레이
2) **Dual Highlight**: 일정 마일스톤 클릭 ↔ 관련 서류 필터/강조

---

## 4) 데이터 계약(스키마) — 확장 가능하게 고정

### 4.1 ScheduleData (현 구조 유지)
- `TaskInput`(업로드 입력) → `ScheduleTask`(렌더링) → `ScheduleData`(Preview)
- Trip 그룹핑 키는 **Activity ID (2)** 를 기본으로 사용한다.

### 4.2 DocRule / DocStatus (서류 엔진)
- `DocRule`: 문서 정의(카테고리/필수/기준 마일스톤/리드타임)
- `DocStatus`: 상태(Submitted/Approved 등), 오너, 제출일, 증빙 링크

#### 필수 계산 규칙
- `dueDate = anchorMilestoneDate + offsetDays`
- `businessDays=true`면 주말 보정(프로젝트 캘린더 확장 가능하도록 분리)
- 상태 판정: `On Track / At Risk / Overdue / Unknown`

> 구현 규칙: 마감 계산 로직은 **단일 유틸(예: lib/documents/deadline-engine.ts)** 로만 존재해야 하며, 컴포넌트 안에 중복 구현 금지.

---

## 5) “하드코딩 금지”를 위한 설계 규칙 (Config/Adapter/Feature Flags)

### 5.1 Config-first
- 화면에 표시되는 레이블/탭/정렬/필터/카테고리는 코드 상수로 박지 말고, 다음 중 하나로 관리한다.
  - `data/*.json` (정적)
  - `lib/config/*.ts` (타입 안전한 설정)
  - `.env.local` (환경별 스위치)

#### 예시(권장)
- `data/doc-rules.default.json`: 서류 룰 기본값
- `data/views.json`: 사이드바/탭 라우팅 정의
- `data/milestone-map.json`: 마일스톤 매칭 룰(정규식/키워드)

### 5.2 Adapter-first
새로운 데이터 소스가 들어와도 UI/로직이 깨지지 않도록 어댑터 레이어를 둔다.
- `ScheduleSourceAdapter`: 업로드/고정데이터/외부API
- `DocRuleSourceAdapter`: 정적 JSON/DB/외부(SharePoint 등)
- `TideWeatherAdapter`: 정적 JSON/외부 API

> 규칙: UI는 어댑터가 반환하는 **정규화된 타입**만 사용한다.

### 5.3 Feature Flags
- 신규 기능(예: Deadline 오버레이, 서버 영속화, RBAC)은 `FEATURE_*` 환경변수/설정으로 토글 가능하게 한다.

---

## 6) 폴더/코드 컨벤션 (리뉴얼 시 권장 구조)

### 6.1 App Router 라우팅
- 기존 `app/page.tsx`를 유지하되, Control Tower는 단계적으로 아래로 분리한다.
  - `app/(dashboard)/page.tsx` : Shell + View Router
  - `app/api/generate/route.ts` : 스케줄 생성
  - `app/api/download/route.ts` : 산출물 다운로드

### 6.2 컴포넌트 경계
- `components/` : UI 컴포넌트
- `components/views/` : 페이지 단위 뷰(Schedule/Documents/Operations/TideWeather)
- `lib/` : 파싱/스키마/계산 엔진/어댑터
- `data/` : 정적 룰/샘플/기본 설정(JSON)

### 6.3 상태 관리
- 1차(권장): **Context Provider + 파생 계산(useMemo)**
- 확장 시: Zustand 등 스토어 도입 가능(단, 의존성 추가 시 영향 범위 명시)

---

## 7) 성능 가드레일 (Vercel + React)

### 7.1 기본 원칙
이 프로젝트는 **Vercel React Best Practices**를 기본 표준으로 따른다.
상세 규칙 및 운영 절차는 `docs/ai/vercel-react-best-practices.md`를 참조한다.

**우선순위 기준 (Impact 기준)**:
- **CRITICAL**: Async Waterfalls, Bundle Size
- **HIGH**: Server-Side Performance, Client-Side Data Fetching
- **MEDIUM**: Re-render Optimization, Rendering Performance

### 7.2 프로젝트 특화 성능 규칙

1) **무거운 뷰 지연 로딩**
   - Gantt/차트 등 무거운 뷰는 `dynamic import`로 분리
   - 브라우저 의존 컴포넌트는 `ssr:false` 활용
   - 예: `const GanttPreview = dynamic(() => import('./gantt-preview'), { ssr: false })`

2) **불필요 re-render 방지**
   - `useMemo/useCallback` 적극 활용
   - 리스트 렌더 키 안정화
   - Context 값 안정화 (객체/배열 새로 생성 방지)

3) **대용량 데이터 처리**
   - 가상 스크롤(필요 시) + 단계적 로딩
   - Preview용 vs Download용 데이터 분리
   - API 응답은 필요한 최소 데이터만 반환

4) **Waterfall 방지 (CRITICAL)**
   - 독립 작업은 `Promise.all()`로 병렬화
   - 데이터 페칭은 컴포넌트 구성으로 병렬화
   - RSC 경계에서 직렬화 비용 최소화

5) **번들 크기 최적화 (CRITICAL)**
   - Barrel imports(`index.ts`) 피하기
   - 조건부 모듈 로딩
   - 무거운 서드파티 라이브러리는 동적 import
   - 사용자 의도 기반 preload (hover/focus)

### 7.3 성능 감사(Audit) 워크플로우
코드 변경 시 성능 영향 평가:
1. **Audit First**: 변경 전 성능 위반 사항 식별
2. **Impact 우선**: CRITICAL/HIGH 항목부터 처리
3. **검증**: 변경 후 번들 크기/렌더링 성능 확인

> 상세 감사 절차는 `docs/ai/vercel-react-best-practices.md`의 "운영 절차" 섹션 참조

---

## 8) 보안/안정성 (입력 검증/오류 복구)

### 8.1 입력 검증
- 허용 확장자: `.tsv`, `.csv`, `.json`, `.txt` (현 파서 정책 유지)
- 최대 크기: 10MB (현 정책 유지)
- 서버에서도 동일 검증을 수행(클라 검증만 믿지 않음)

### 8.2 데이터 누락 복구
- 마일스톤 누락 시: `Unknown` + “—” 표시 + 원인(매칭 실패/데이터 누락) 툴팁
- 일정 미확정이면 DueDate를 “잠정”으로 표시하고 Overdue 판정 제외

---

## 9) 개발/테스트/빌드 표준 (Vercel 친화)

### 9.1 기본 명령
```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
```

### 9.2 최소 테스트(권장)
- `deadline-engine` 단위 테스트: businessDays 보정, At Risk/Overdue 판정, 누락 처리
- 회귀 방지: `doc-rules.default.json`는 `zod`로 파싱 실패 시 빌드/테스트에서 즉시 탐지

---

## 10) 작업 지시 템플릿 (에이전트가 따라야 할 방식)

### 10.1 변경 요청을 받으면
1) **스키마/설정 변경 여부**를 먼저 판단
2) 필요 시 `data/*.json` 또는 `lib/config/*.ts`에 설정 추가
3) 어댑터/유틸 단에서 정규화 후 UI 적용
4) **성능 영향(번들/렌더) 확인** (Vercel React Best Practices 기준)
   - Waterfall 발생 여부 검토
   - Bundle 크기 영향 평가
   - Re-render 최소화 여부 확인
5) 테스트/린트/빌드 통과 확인

### 10.2 금지 패턴
- 날짜/마감 규칙을 컴포넌트에서 직접 계산
- Voyage 수(4), TR 유닛(7), 특정 날짜(예: 2026-01-26)를 코드에 박아넣기
- HTML을 그대로 복사해 React 컴포넌트에 하드코딩(반드시 JSON/정규화 데이터로 변환)

---

## 11) 1차 백로그 (유연성 우선 순서)

1) **DocRule JSON 정식화**: PTW/Loading/NOC 규칙을 JSON으로 관리하고 스키마 검증 고정
2) **Milestone 매칭 룰 분리**: `milestone-map.json`로 프로젝트 네이밍 변화에 대응
3) **Documents View**: KPI + 체크리스트 + 상태 저장(로컬 → Export/Import)
4) **Deadline Ladder**: Gantt Overlay(옵션 컴포넌트)
5) **Blob 기반 다운로드 파이프라인**: 생성물 저장/다운로드를 Vercel 방식으로 표준화

---

## 12) 참고(프로젝트 내부 문서)

### 아키텍처/설계 문서
- 시스템 아키텍처/데이터 흐름: `SYSTEM_ARCHITECTURE.md` / `SYSTEM_ARCHITECTURE_KO.md`
- 시스템 레이아웃/컴포넌트 계층: `SYSTEM_LAYOUT.md` / `SYSTEM_LAYOUT_EN.md`
- 통합 프로토타입 설계(사이드바 멀티뷰/DocRule/Deadline 엔진): `통합.md`
- 정적 HTML(운영/서류) 원본: `option_a_dashboard_...html`, `gate_pass_customs_checklist_...html`

### 성능/코딩 표준 문서
- Vercel React Best Practices: `docs/ai/vercel-react-best-practices.md`
  - React/Next.js 성능 최적화 규칙 (Waterfall, Bundle, Re-render 등)
  - 에이전트용 Audit/Plan/Fix 워크플로우
  - 규칙 인덱스 및 검증 방법

### 배포 문서
- 배포 가이드: `DEPLOYMENT.md` / `DEPLOYMENT_KO.md`
