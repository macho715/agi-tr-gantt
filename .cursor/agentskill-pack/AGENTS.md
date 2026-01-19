# Project Agent Guidelines — Control Tower Dashboard (Gantt + Docs)

## 0) 목적
- Vercel 기반 Next.js **Gantt(Schedule)**와 정적 HTML 기반 **운영/서류(Documents/Operations)**를 **단일 Control Tower**로 통합한다.
- 핵심 기능: **Voyage(Trip) 단위**로 일정 변경 시 **서류 DueDate 자동 재계산** 및 **At Risk/Overdue 즉시 표시**.

## 1) 작업 원칙
1. **Schema-first**: UI 구현 전에 `voyageId` 기준 데이터 모델/조인 규칙을 먼저 확정한다.
2. **Pure Function**: DueDate 계산은 UI/서버 어디서든 재사용 가능한 **순수 함수**로 고정한다.
3. **Progressive Disclosure**: 기본 문서는 짧게, 상세는 `references/`로 분리한다.
4. **Performance by design**: 라우트/패널 분리 + lazy loading + 불필요 re-render 최소화.
5. **Accessibility gate**: 키보드 포커스/탭 이동/ARIA를 릴리스 체크리스트에 포함한다.

## 2) 통합 정의(SSOT)
- **SSOT Key**: `voyageId` (= `tripKey`/Trip Group). 모든 데이터는 이 키로 조인된다.
- **Milestones**: `mzpArrival`, `loadout`, `sailAway`, `agiArrival` (ISO 8601, TZ=Asia/Dubai).
- **Docs Definition**: 초기에는 정적 JSON(`docsDef.json`)을 사용하고, 이후 DB로 이행한다.

## 3) 금지/주의
- 내부 계약 단가/PII(전화번호, 이메일, 계정정보)는 스킬/예시/로그에 포함하지 않는다.
- 파괴적 명령(삭제/대량 수정)은 **dry-run → 명시적 확인** 흐름을 기본으로 한다.

## 4) 스킬 사용 안내
- 이 리포지토리에는 다음 스킬이 포함된다.
  - `control-tower-dashboard-integrator`: Gantt+Docs 통합 설계/컴포넌트 분해/IA/성능·접근성 체크
  - `voyage-docs-duecalc`: 서류 정의(JSON) 생성 + DueDate 계산 + At Risk/Overdue 산출
- 스킬은 필요할 때만 로드되는 문서 패키지이며, 수동 호출 시 스킬명으로 호출할 수 있다(에이전트별 표기 상이).

## 5) 산출물 기준
- 변경은 반드시 다음 중 하나로 남긴다.
  - `docs/` 문서 업데이트(설계/스키마/규칙)
  - `skills/` 업데이트(스킬 절차/스크립트/예시)
  - 코드 변경(PR) + 체크리스트(성능/접근성/테스트)
