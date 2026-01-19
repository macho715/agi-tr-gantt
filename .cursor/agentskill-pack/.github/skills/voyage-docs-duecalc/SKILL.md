---
name: voyage-docs-duecalc
description: "정적 HTML/텍스트 체크리스트에서 docsDef.json을 생성하고, voyage milestones를 입력받아 문서 DueDate 및 상태(ON_TRACK/AT_RISK/OVERDUE/PENDING_MILESTONE)를 계산한다. businessDays(주말 보정) 옵션을 지원한다."
compatibility: "Python 3.10+ 권장. (스크립트 옵션)"
---

# 목적
- 체크리스트(정적 HTML/텍스트)를 **구조화(docsDef.json)** 하고,
- Voyage의 milestones 기준으로 **DueDate/리스크 상태를 자동 계산**한다.

# 사용 시점/트리거
- “서류 DueDate 자동 계산”, “D-4/24h 규칙 반영”, “At Risk 목록 자동 생성”

# 입력
- (필수) `voyage.json` (milestones 포함)
- (필수) `docsDef.json` 또는 원문 체크리스트(HTML/텍스트)
- (선택) 근무일 캘린더(주말/휴일)

# 출력
- `docsComputed.json`: 문서별 `dueAt`, `risk` 산출
- (선택) `at_risk_queue.json`: Overdue/AtRisk만 필터

# Workflow
1) 체크리스트가 HTML/텍스트면 `extract_docsdef.py`로 `docsDef.json` 생성
2) `calc_due_dates.py`로 due/risk 계산
3) UI는 `risk`를 배지/필터/예외 큐에 사용

# Scripts
- `scripts/extract_docsdef.py`
- `scripts/calc_due_dates.py`

# Safety
- 입력에서 이메일/전화번호가 발견되면 기본적으로 마스킹한다.
