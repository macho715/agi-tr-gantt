---
id: vercel-react-best-practices
type: agent-playbook
status: draft
owner: engineering
last_updated: 2026-01-19
upstream:
  repo: https://github.com/vercel-labs/agent-skills
  skill: react-best-practices
  agents_md:
    version: "1.0.0"
    published: "2026-01"
  install_tool: https://github.com/vercel-labs/add-skill
sources:
  - https://vercel.com/blog/introducing-react-best-practices
  - https://github.com/vercel-labs/agent-skills
  - https://raw.githubusercontent.com/vercel-labs/agent-skills/refs/heads/main/skills/react-best-practices/AGENTS.md
  - https://github.com/vercel-labs/add-skill
---

# Vercel React Best Practices (Agent Skill) — 프로젝트 적용 가이드

## 목적
이 문서는 AI 코딩 에이전트(Claude Code, Cursor 등)가 React/Next.js 코드를 작성/리팩토링할 때,
"돌아가는 코드"가 아니라 **성능/번들/렌더링까지 고려된 프로덕션 품질 코드**를 일관되게 생산하도록
Vercel의 `react-best-practices` 규칙을 프로젝트 단위로 적용하는 표준 운영 절차(SOP)를 정의한다.

## 배경 (문제 정의)
AI 코딩은 기능 구현 속도는 빠르지만, 복잡도가 올라가면 다음 문제가 반복된다.
- 독립 작업을 직렬로 처리해 **async waterfall** 발생
- 불필요한 import/번들 확대로 **TTI/LCP 악화**
- RSC 경계(서버/클라이언트) 직렬화 비용을 과소평가
- 리렌더/이벤트 리스너/스토리지 접근이 과도하여 체감 성능 저하

## 적용 범위
- React, Next.js(App Router/Server Components 포함), TypeScript 코드베이스
- 특히 "데이터 페칭/렌더링/번들"과 관련된 변경(PR, 기능 추가, 리팩토링)에 우선 적용

### 프로젝트 컨텍스트 (agi-tr-gantt)
이 프로젝트는 **Control Tower 대시보드**로 확장 중이며, 다음 기능에 특히 주의:
- **Gantt 차트 렌더링**: 무거운 뷰이므로 동적 import 필수
- **Deadline Ladder 오버레이**: Gantt 위 오버레이 컴포넌트 성능 최적화 필요
- **다중 뷰 전환**: Schedule/Documents/Voyages 등 뷰 간 전환 시 번들 분할
- **파일 업로드/다운로드**: 대용량 Excel 생성 시 메모리/성능 고려
- **실시간 미리보기**: ScheduleData 변경 시 불필요한 전체 리렌더 방지

> 프로젝트 전용 운영 규칙은 `.cursor/AGENTS.md` 참조

## 원칙 (에이전트 실행 규약)
1. **Audit First**: 코드를 바로 고치기 전에, 항상 규칙 위반을 먼저 식별하고 우선순위를 정한다.
2. **High-Impact First**: CRITICAL/HIGH 영향도 규칙(특히 Waterfall/Bundle)을 최우선으로 처리한다.
3. **Explain & Prove**: 변경마다 "왜 이게 성능에 유효한지" + "검증 방법(테스트/측정)"을 함께 제시한다.
4. **Minimal Diff**: 성능 개선에 직접 기여하지 않는 스타일/구조 변경은 별도 커밋 또는 후순위로 둔다.

---

# 설치 (권장: add-skill로 프로젝트에 벤더링)
`add-skill`은 git repo에서 Agent Skill을 가져와, 각 에이전트의 프로젝트 경로에 설치한다.

## Quick Start
```bash
# (1) 저장소에서 설치 가능한 skill 목록 확인
npx add-skill vercel-labs/agent-skills --list

# (2) react-best-practices만 프로젝트에 설치(비대화형)
# - Claude Code + Cursor를 같이 쓰는 경우 예시
npx add-skill vercel-labs/agent-skills --skill react-best-practices -a claude-code -a cursor -y
```

## 설치 위치 확인(프로젝트 기준)

* Claude Code: `.claude/skills/`
* Cursor: `.cursor/skills/`

> 팀 공유를 원하면 위 디렉토리를 **프로젝트에 커밋**한다(프로젝트 단위 표준화).

## 전역 설치(개인 환경에만 적용)

```bash
# 전역(-g) 설치 시, 사용자 홈 디렉토리에 설치됨
npx add-skill vercel-labs/agent-skills --skill react-best-practices -g -a claude-code -y
```

---

# 로드/동작 확인(에이전트 공통)

## Claude Code

* 대화에서 다음과 같이 물어 확인한다:

  * `What Skills are available?`
* 스킬은 요청이 description과 매칭되면 자동 적용된다(명시 호출 불필요).
* 트리거가 약하면, 요청 문장에 "audit", "performance", "waterfall", "bundle size", "React/Next.js" 같은 키워드를 포함한다.

## Cursor

* Cursor의 Rules/Skills UI 상태에 따라 동작이 다를 수 있다.
* 가능하면 `.cursor/skills/`에 설치된 스킬을 우선 활용하고,
  그렇지 않으면 아래 "Cursor 보조 규칙(.cursorrules)" 섹션을 사용한다.

---

# 운영 절차 (Audit → Plan → Fix → Verify)

## 1) Audit (감사)

에이전트에게 아래 요구사항을 포함해 요청한다.

* 스코프(예: 특정 페이지, 전체 앱, 특정 폴더)
* 산출물 형식(아래 템플릿)
* 우선순위 기준(Impact 기준)

### Audit 요청 템플릿 (한국어)

* "이 코드베이스를 Vercel `react-best-practices` 기준으로 감사해줘.
  Waterfall/번들/서버 성능/리렌더/렌더링 성능 위반을 찾고,
  Impact(CRITICAL→LOW) 기준으로 정렬해 개선 계획을 만들어줘.
  각 항목은 규칙 ID(예: 1.4), 파일 경로, 근거, 수정 방안, 검증 방법을 포함해줘."

## 2) Plan (개선 계획)

* CRITICAL/HIGH 항목을 1차 범위로 묶고
* "작은 PR" 단위(예: 3~5개 수정)로 나눠 리스크를 낮춘다.

## 3) Fix (리팩토링/수정)

* **PR/커밋 단위**로 "High Impact"부터 적용한다.
* 변경 후 반드시:

  * 테스트(가능하면)
  * build/lint(가능하면)
  * 주요 사용자 플로우 smoke 확인

## 4) Verify (검증)

* 정량 지표를 확보할 수 있으면:

  * 빌드 아티팩트 크기 변화(번들)
  * waterfall 제거로 인한 서버 응답 시간/TTFB 감소
  * 리렌더 감소(React DevTools/로그 기반)

---

# 규칙 인덱스 (Upstream 목차 기준)

아래는 upstream `AGENTS.md` 목차의 규칙 ID/이름이다.
(목차 기준 1.1~8.2까지 번호가 부여됨)

## 1. Eliminating Waterfalls (CRITICAL)

* 1.1 Defer Await Until Needed
* 1.2 Dependency-Based Parallelization
* 1.3 Prevent Waterfall Chains in API Routes
* 1.4 Promise.all() for Independent Operations
* 1.5 Strategic Suspense Boundaries

## 2. Bundle Size Optimization (CRITICAL)

* 2.1 Avoid Barrel File Imports
* 2.2 Conditional Module Loading
* 2.3 Defer Non-Critical Third-Party Libraries
* 2.4 Dynamic Imports for Heavy Components
* 2.5 Preload Based on User Intent

## 3. Server-Side Performance (HIGH)

* 3.1 Cross-Request LRU Caching
* 3.2 Minimize Serialization at RSC Boundaries
* 3.3 Parallel Data Fetching with Component Composition
* 3.4 Per-Request Deduplication with React.cache()
* 3.5 Use after() for Non-Blocking Operations

## 4. Client-Side Data Fetching (MEDIUM-HIGH)

* 4.1 Deduplicate Global Event Listeners
* 4.2 Use Passive Event Listeners for Scrolling Performance
* 4.3 Use SWR for Automatic Deduplication
* 4.4 Version and Minimize localStorage Data

## 5. Re-render Optimization (MEDIUM)

* 5.1 Defer State Reads to Usage Point
* 5.2 Extract to Memoized Components
* 5.3 Narrow Effect Dependencies
* 5.4 Subscribe to Derived State
* 5.5 Use Functional setState Updates
* 5.6 Use Lazy State Initialization
* 5.7 Use Transitions for Non-Urgent Updates

## 6. Rendering Performance (MEDIUM)

* 6.1 Animate SVG Wrapper Instead of SVG Element
* 6.2 CSS content-visibility for Long Lists
* 6.3 Hoist Static JSX Elements
* 6.4 Optimize SVG Precision
* 6.5 Prevent Hydration Mismatch Without Flickering
* 6.6 Use Activity Component for Show/Hide
* 6.7 Use Explicit Conditional Rendering

## 7. JavaScript Performance (LOW-MEDIUM)

* 7.1 Batch DOM CSS Changes
* 7.2 Build Index Maps for Repeated Lookups
* 7.3 Cache Property Access in Loops
* 7.4 Cache Repeated Function Calls
* 7.5 Cache Storage API Calls
* 7.6 Combine Multiple Array Iterations
* 7.7 Early Length Check for Array Comparisons
* 7.8 Early Return from Functions
* 7.9 Hoist RegExp Creation
* 7.10 Use Loop for Min/Max Instead of Sort
* 7.11 Use Set/Map for O(1) Lookups
* 7.12 Use toSorted() Instead of sort() for Immutability

## 8. Advanced Patterns (LOW)

* 8.1 Store Event Handlers in Refs
* 8.2 useLatest for Stable Callback Refs

---

# Audit 결과 산출물 (머시너블 템플릿)

아래 YAML 포맷으로 결과를 출력한다(자동화/리뷰/추적 용이).

```yaml
audit:
  timestamp: "YYYY-MM-DD"
  scope: "app/** (or specific paths)"
  baseline:
    notes: "측정값/가정값/관찰 요약"
findings:
  - rule_id: "1.4"
    rule_title: "Promise.all() for Independent Operations"
    impact: "CRITICAL|HIGH|MEDIUM|LOW"
    location:
      file: "path/to/file.tsx"
      lines: "L12-L48"
    evidence: "왜 위반인지(짧게)."
    fix:
      summary: "무엇을 어떻게 바꿀지"
      approach: "예: Promise.all, 컴포넌트 구성 변경, dynamic import 등"
    verification:
      - "테스트/빌드 커맨드"
      - "성능 확인 방법(지표/체감)"
    status: "todo|in_progress|done"
plan:
  - pr: 1
    priority: "P0|P1|P2"
    items: ["finding-1", "finding-2"]
    risk: "low|medium|high"
    rollback: "간단 롤백 전략"
```

---

# 확장(선택): UI/접근성까지 포함하려면

`react-best-practices`는 성능/렌더링 중심이다.
UI/접근성/UX까지 자동 감사하려면 `web-design-guidelines` 스킬을 추가로 설치하는 것을 권장한다.
(별도 100+ 룰 세트)

```bash
npx add-skill vercel-labs/agent-skills --skill web-design-guidelines -a claude-code -a cursor -y
```

---

# 유지보수(업데이트 정책)

* 월 1회 또는 Next.js/React 메이저 업그레이드 시:

  * `npx add-skill vercel-labs/agent-skills --list`로 변경 여부 확인
  * 프로젝트 벤더링 디렉토리(`.claude/skills/`, `.cursor/skills/`) 업데이트 후 커밋
* 문서 버전(`last_updated`) 갱신 및 변경점 기록
