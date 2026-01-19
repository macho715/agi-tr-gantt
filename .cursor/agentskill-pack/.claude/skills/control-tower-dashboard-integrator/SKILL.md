---
name: control-tower-dashboard-integrator
description: "Vercel Next.js Gantt(일정)와 정적 HTML 운영/서류 대시보드를 통합 Control Tower로 설계/구현한다. voyageId 단일 키로 일정↔서류를 연동하고, DueDate 자동 재계산·At Risk 표시·성능/접근성 게이트를 포함한다."
compatibility: "Next.js(App Router 가능), React, Vercel. 스크립트는 옵션."
---

# 목적
- 기존 **Gantt 대시보드**와 **운영/서류(정적 HTML)**를 **단일 Control Tower UX**로 통합한다.
- **일정 변경 → 서류 마감(DueDate) 자동 재계산 → 리스크(At Risk/Overdue) 즉시 반영**을 구현한다.

# 사용 시점/트리거
- “Gantt와 서류 체크리스트를 하나로 합치자”, “Voyage별 서류 Due 계산을 자동화하자”, “Control Tower로 통합하자”

# 입력
- (필수) 현재 Gantt 데이터 구조(Trip/Voyage 그룹 키)
- (선택) 정적 HTML(운영/서류) 또는 체크리스트 텍스트/표

# 출력
- 컴포넌트 분해도(페이지/패널/상호작용)
- 데이터 모델(voyageId 조인, milestones, docsDef, docStatus)
- 구현 체크리스트(성능/접근성/테스트)

# Workflow (체크리스트)
1) **SSOT Key 확정**
   - `voyageId` = `tripKey`(Trip Group)로 고정
   - 예외 매핑은 `tripKeyAlias[]`로 흡수

2) **페이지 IA 결정**
   - 권장: 좌측 사이드바 멀티뷰(Program/Schedule/Documents/Voyages/Operations/Tide&Weather)
   - 최소: 단일 페이지 탭 확장(속도 우선)

3) **시그니처 인터랙션 구현**
   - Deadline Ladder: Gantt 위에 Due 마커 오버레이
   - Dual Highlight: 마일스톤 클릭 ↔ 관련 서류 필터 동기화

4) **성능 설계**
   - 라우트/패널 단위 lazy load
   - 리스트 virtualization(문서/액티비티 대량 대비)
   - re-render 원인(derived state, unstable props) 제거

5) **접근성 게이트**
   - 키보드 탭 이동/포커스 가시성
   - 상태 배지: 색+아이콘+텍스트(ARIA)

# Examples
- 좋은 예: “Voyage V071 선택 → milestones 로드 → docsDef 적용 → due/risk 표시 → 예외 큐에서 조치 등록”
- 나쁜 예: “페이지마다 Due 계산을 따로 구현(불일치/버그 확률 급증)”

# Edge cases
- milestone 누락: `PENDING_MILESTONE` 처리 + UI에 “잠정” 배지
- 타임존 혼재: 모든 ISO는 Asia/Dubai(+04:00) 기준으로 normalize

# Safety
- 내부 단가/PII는 스킬 산출물에 포함하지 않는다.
- 대량 수정은 dry-run 결과를 먼저 보여주고, 명시적 확인 이후 실행한다.

# References
- 상세 설계/스키마/리스크 완화: `references/FULL.md`
