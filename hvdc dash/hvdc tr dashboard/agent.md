# agent.md (AI Coding Agent Instructions)

당신은 이 리포지토리의 AI 코딩 어시스턴트입니다.  
아래 규칙을 **우선순위 높게** 준수하고, 불확실한 항목은 추측하지 말고 **“가정:” 또는 “확인 필요”**로 남기십시오.

---

## 0) 절대 규칙 (Hard Rules)

1) **UI 스타일/테마 보존(Style-first)**  
- `globals.css`의 “Deep Ocean Theme” 변수/그라데이션/그리드 오버레이/스크롤바 스타일을 임의로 변경하지 않습니다.

2) **포맷/구조 보존(Transfer-first)**  
- 파일의 큰 구조(레이아웃/페이지 조립 방식)는 유지합니다. 특히 `app/layout.tsx`, `app/page.tsx`의 구성 패턴을 따릅니다.

3) **추측 금지(Hallucination Ban)**  
- `package.json`, `tsconfig.json`, ESLint 설정을 확인하기 전까지 패키지 매니저(pnpm/yarn/npm), 테스트 프레임워크(jest/vitest) 등은 단정하지 않습니다.  
- 존재하지 않는 스크립트/파일/폴더를 “있는 것처럼” 문서에 적지 않습니다.

4) **민감 정보 금지(NDA/PII)**  
- API Key/토큰/계정정보/내부 단가/PII(전화/이메일)는 코드/문서/로그에 기록하지 않습니다.

---

## 1) 프로젝트 개요 (What this is)

- Next.js(App Router) 기반의 **HVDC TR Transport Dashboard (AGI Site)** 입니다.  
- 홈 페이지는 `DashboardHeader → Notices → KPI → Weather → Voyages → Schedule → Gantt → Footer` 순서로 조립됩니다.  
- 전역 테마는 Tailwind + CSS variables(OKLCH) 기반이며, “Deep Ocean Theme” 시각 정체성이 핵심입니다.

---

## 2) 작업 우선순위 (Work Order)

1) **Small Diff 우선**: 컴포넌트 단위로 쪼개고 변경 범위를 최소화합니다.  
2) **SSOT 우선**: 데이터/상수/타이틀/기간 등은 단일 파일에서 관리(중복 금지).  
3) **검증 게이트 통과**: 타입/린트/테스트(가능한 범위)를 통과시키고 제출합니다.

---

## 3) 로컬 실행/빌드/검증 커맨드 (Commands) — 확정 규칙

> 원칙(추측 금지): 커맨드는 **반드시 `package.json`의 `scripts`** 및 **설정 파일(tsconfig/eslint)** 존재 여부에 의해 “자동 확정”한다.  
> - 패키지 매니저(pnpm/yarn/npm)는 **lock 파일** 우선순위로 결정한다.  
> - 존재하지 않는 스크립트는 문서에 적지 않는다(추측 금지).

### 3.1 패키지 매니저 확정 규칙 (Lockfile 기반)
- `pnpm-lock.yaml` 존재 → **pnpm**
- `yarn.lock` 존재 → **yarn**
- `package-lock.json` 존재 → **npm**
- lockfile 미존재 → **npm**(가정: 최소 호환)

### 3.2 스크립트 확정 규칙 (package.json scripts 기반)
아래 스크립트 키가 존재할 때만 사용한다.
- 개발: `dev`
- 빌드: `build`
- 실행: `start`
- 린트: `lint`
- 타입체크: `typecheck` 또는 `tsc` 또는 `check`(프로젝트 정의에 따름)
- 포맷: `format` 또는 `fmt`
- 테스트: `test`

### 3.3 “확정 커맨드 출력” 템플릿 (에이전트 수행 절차)
1) `package.json`을 열어 `scripts`를 나열한다.  
2) lockfile로 매니저를 확정한다.  
3) 아래 표를 “존재하는 항목만” 채운다.

| 목적 | 스크립트 키 | 확정 커맨드 |
|---|---|---|
| Install | - | `<PM> install` 또는 `<PM> ci`(npm만) |
| Dev | dev | `<PM> run dev` |
| Build | build | `<PM> run build` |
| Start | start | `<PM> run start` |
| Lint | lint | `<PM> run lint` |
| Typecheck | typecheck/tsc/check | `<PM> run <key>` |
| Test | test | `<PM> run test` |
| Format | format/fmt | `<PM> run <key>` |

> 예: pnpm 확정 시 `<PM>` = `pnpm`  
> 예: npm 확정 시 Install은 `npm ci`(package-lock 존재) 우선

### 3.4 ESLint/TSConfig 연동 규칙
- ESLint 설정 파일(`eslint.config.*`, `.eslintrc.*`) 존재 + `lint` 스크립트 존재 → `lint`는 **필수 게이트**
- `tsconfig.json` 존재 + `typecheck`(또는 동등 스크립트) 존재 → `typecheck`는 **필수 게이트**
- 위 스크립트가 없으면 **새 스크립트 추가는 Ask-first(사전 승인 필요)** 로 분류한다.

### 3.5 실패 처리(Fail-safe)
- 커맨드가 없거나 실행이 실패하면, “추측으로 대체 커맨드”를 제시하지 않는다.
- 대신 아래를 출력한다:
  - (1) 확인한 `scripts` 목록
  - (2) 존재하지 않아 실행 불가한 키
  - (3) 사용자가 승인하면 추가할 스크립트 제안(Ask-first)

---

## 4) 코드 스타일 & 컨벤션 (Code Style)

- TypeScript/React는 **함수형 컴포넌트** 우선, 컴포넌트는 가능한 **작게 분리**합니다.
- import 순서:
  1) 외부 라이브러리
  2) 내부 alias(`@/…`)
  3) 상대경로
- CSS는 Tailwind 유틸 + 전역 테마 변수 사용을 우선합니다.  
  - 임의의 하드코딩 색상 추가 금지(테마 변수/유틸로 해결)
- 레이아웃/페이지 조립 규칙:
  - `app/page.tsx`는 “페이지 조립자(composition root)” 역할만 수행하고, 로직/상태는 하위 컴포넌트로 이동합니다.

---

## 5) UI/UX 규칙 (Dashboard Quality Bar)

- “카드/글래스/글로우” 스타일은 전역 유틸 클래스(예: `.bg-glass`, `.shadow-glow` 등)와 일관되게 사용합니다.
- KPI/알람/스케줄/Gantt는 다음 원칙으로 확장:
  - **정보 밀도는 높게**, 그러나 한 화면에서 **시각적 노이즈는 낮게**
  - “경고(Alerts)”는 색상만으로 전달하지 말고 텍스트/아이콘/레이블을 병행
  - 날짜/시간은 ISO(YYYY-MM-DD) 표기 선호(요구사항 충돌 시 사용자 지침 우선)

---

## 6) 데이터/스키마 가이드 (Schema-first)

- 일정(Gantt)과 서류 체크리스트 연동은 “공통 키”로 결합:
  - 예: `voyage_id`, `tr_unit_id`, `milestone_id`
- 상태 값은 enum으로 제한(자유 텍스트 금지):
  - 예: `status: "planned" | "in_progress" | "blocked" | "done"`
- SSOT 위치(권장):
  - `src/lib/ssot/*` 또는 `src/data/*` 중 한 곳으로 통일(중복 금지)

---

## 11) 현재 SSOT 파일 (Reference)

- 전역 테마/유틸: `globals.css`
- 앱 메타/폰트/Analytics: `app/layout.tsx`
- 홈 조립 루트: `app/page.tsx`
