# FULL — Voyage Docs DueDate 계산 규격

## 1) 입력 규격
### voyage.json
- `voyageId: string`
- `milestones: { mzpArrival?: string, loadout?: string, sailAway?: string, agiArrival?: string }`

### docsDef.json
- 배열(JSON list)이며 각 항목은 다음 필드를 가진다.
  - `docId: string` (slug 권장)
  - `title: string`
  - `category: string` (예: PTW, HSE, Marine, Cargo)
  - `leadDays: number`
  - `triggerMilestone: string` (milestones 키 중 하나)
  - `businessDays: boolean` (주말 보정)
  - `mandatory: boolean`
  - `ownerRole: string` (예: OFCO/GRM/DSV/SCT)

## 2) 계산 규칙
- `dueAt = anchorDate - leadDays`
- `businessDays=true`이면 주말(토/일)을 건너뛰며 역산한다.
- 상태(risk)는 `now` 대비로 계산한다.
  - `OVERDUE`: `dueAt < now`
  - `AT_RISK`: `0.00 <= (dueAt - now) <= at_risk_days` (기본 1.00일)
  - `ON_TRACK`: 그 외
  - `PENDING_MILESTONE`: trigger milestone이 비어 있음

## 3) 출력 규격
- docsComputed.json(배열)
  - docsDef 필드 + `voyageId`, `dueAt`, `risk`, `deltaDays`

## 4) 추천 운영 규칙
- “D-4”는 `leadDays=4`로 모델링한다.
- “≥24h” 규칙은 `at_risk_days=1.00` 또는 문서별 별도 leadDays로 모델링한다.
- milestone 변경 시 docsComputed는 즉시 재계산(프론트/백 동일 로직).

