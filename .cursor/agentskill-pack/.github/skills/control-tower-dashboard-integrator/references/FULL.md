# FULL — Control Tower 통합 구현 가이드

## 1) SSOT(데이터 결합 원칙)
- **키:** `voyageId`를 유일 조인 키로 고정한다.
- **시간:** 모든 milestone/due는 ISO 8601 + TZ(Asia/Dubai)로 정규화한다.
- **계산:** DueDate는 “한 곳”에서만 계산한다(중복 금지, 순수 함수화).

## 2) 권장 데이터 모델(최소)
### Voyage
- `voyageId: string`
- `tripKey: string`
- `milestones: { mzpArrival?: string, loadout?: string, sailAway?: string, agiArrival?: string }`

### Document Definition (`docsDef.json`)
- `docId: string` (안정적인 슬러그)
- `title: string`
- `category: string` (예: PTW, HSE, Marine, Port)
- `leadDays: number`
- `triggerMilestone: string` (예: loadout)
- `businessDays: boolean`
- `mandatory: boolean`
- `ownerRole?: string` (예: OFCO, GRM, DSV, SCT)

### Document Status (`docStatus.json`)
- `voyageId, docId`
- `status: Not Started | In Progress | Submitted | Approved | Rejected | Not Required`
- `submittedAt?: string`
- `evidenceUrl?: string`
- `updatedBy: string` (이름은 허용, 연락처는 금지)
- `updatedAt: string`

## 3) UI 패턴(운영형)
- **Schedule + Documents 동기화**
  - 마일스톤 클릭 → 관련 문서 필터
  - 문서 클릭 → 연결된 마일스톤 하이라이트
- **Deadline Ladder Overlay**
  - Gantt 위에 `dueAt`를 세로 마커로 표시
- **Exception Queue(권장)**
  - `risk in {AT_RISK, OVERDUE}`만 모아서 “조치 등록” 흐름을 제공

## 4) 성능/확장성 가드레일
- 라우트/패널 단위 lazy loading(예: Tide/Weather는 별도 페이지 또는 on-demand)
- 대량 리스트는 virtualization 고려(문서/액티비티가 수백 단위일 때)
- 파생 상태(derived state)는 memoization으로 고정하고, unstable props를 제거한다.

## 5) 접근성(운영 필수)
- 키보드 탭 이동 가능(포커스 이동 순서가 자연스러워야 함)
- 포커스 표시가 항상 보이도록(Focus Visible)
- 위험 상태는 색만 쓰지 말고 아이콘/텍스트를 병행한다.

## 6) 테스트(최소)
- `calcDocDueDates()` 단위테스트: 주말 보정, milestone 누락(PENDING_MILESTONE), TZ 파싱
- 스냅샷/UI 테스트: Dual Highlight 상호작용(필터/하이라이트)

