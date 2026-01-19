# Document Workflow Guide

**AGI TR Gantt Generator - Voyage 문서 관리 시스템**

버전: 1.0.0
최종 업데이트: 2026-01-19

---

## 목차

1. [개요](#개요)
2. [하이브리드 레이아웃 사용 가이드](#하이브리드-레이아웃-사용-가이드)
3. [마감일 계산 로직](#마감일-계산-로직)
4. [상태 머신](#상태-머신)
5. [사용 시나리오](#사용-시나리오)
6. [FAQ](#faq)

---

## 개요

Documents 탭은 Voyage별 문서 체크리스트를 관리하는 시스템입니다. 하이브리드 레이아웃(카드/테이블 뷰)을 제공하며, 상태 머신을 통한 워크플로우 관리와 자동 마감일 계산 기능을 포함합니다.

### 주요 기능

- ✅ **하이브리드 레이아웃**: 카드 뷰 ↔ 테이블 뷰 전환
- ✅ **상태 머신**: `not_started → submitted → approved` 전이
- ✅ **자동 마감일 계산**: Anchor Milestone + Offset Days
- ✅ **D-카운트다운**: 마감일까지 남은 일수 표시
- ✅ **Due State**: `on_track` / `at_risk` / `overdue` 자동 판단
- ✅ **History 자동 추가**: 상태 변경 시 자동 기록
- ✅ **Docs Progress Overlay**: Gantt Chart에서 문서 진행률 즉시 확인

---

## 하이브리드 레이아웃 사용 가이드

### 레이아웃 전환

#### 전환 버튼 위치

상단 우측에 두 개의 버튼이 표시됩니다:

```
┌─────────────────────────────────────┐
│ [Card View] [Table View]            │
└─────────────────────────────────────┘
```

- **활성 뷰**: `default` variant (강조된 배경색)
- **비활성 뷰**: `outline` variant (테두리만)
- **기본값**: 카드 뷰

#### 전환 방법

1. "Card View" 버튼 클릭 → 카드 뷰로 전환
2. "Table View" 버튼 클릭 → 테이블 뷰로 전환
3. 전환 시 선택된 카테고리 유지 (테이블 뷰)

### 카드 뷰 (Card View)

#### 레이아웃 구조

```
┌─────────────────────────────────────┐
│ Category 1 (Progress: 5/10)        │
│ ┌─────────────────────────────────┐ │
│ │ [✓] Document Name               │ │
│ │    [Badge] Priority             │ │
│ │    Due: 2026-01-22 [D-3]       │ │
│ │    [Badge] On Track             │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ [ ] Document Name               │ │
│ │    ...                          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### 특징

- ✅ 카테고리별 Card 그룹
- ✅ 체크박스로 `approved` 상태 토글
- ✅ D-카운트다운 Badge 표시
- ✅ Due State Badge (On Track/At Risk/Overdue)
- ✅ Progress Bar (카테고리별 완료율)

#### 사용 시나리오

- 빠른 체크 및 승인
- 전체 문서 개요 확인
- 카테고리별 진행률 확인
- 간단한 승인/미승인 토글

#### 주요 기능

**1. 체크박스 토글**
```
[✓] → approved
[ ] → in_progress
```
- 클릭 시 `updateDoc` 호출
- History 자동 추가

**2. D-카운트다운 표시**
- `D-3`: 3일 남음
- `Due today`: 오늘
- `Overdue 2d`: 2일 지남
- Badge로 표시 (Overdue 시 빨간색 강조)

**3. Due State Badge**
- `On Track`: 초록색
- `At Risk`: 노란색
- `Overdue`: 빨간색

### 테이블 뷰 (Table View)

#### 레이아웃 구조

```
┌──────────────┬────────────────────────────┐
│ Categories   │ Documents Table            │
│ (좌측 4열)    │ (우측 8열)                  │
├──────────────┼────────────────────────────┤
│ [PTW Pack]   │ Document │ Due │ Status │ Action│
│  5/10        │ ─────────┼─────┼────────┼───────┤
│              │ Doc 1    │ D-3 │ Submit │ [Submit]│
│ [Loading]    │ Doc 2    │ D-1 │ Approve│ [Approve]│
│  2/5         │ ...      │ ... │ ...    │ ... │
│              │                            │
│ [NOC]        │                            │
│  0/6         │                            │
└──────────────┴────────────────────────────┘
```

#### 특징

- ✅ 좌측: 카테고리 탭 (Tabs)
- ✅ 우측: 문서 테이블 (4개 컬럼)
- ✅ Submit/Approve 버튼으로 상태 전이
- ✅ D-카운트다운 + Due State 표시
- ✅ 카테고리별 진행률 표시 (좌측 탭)

#### 사용 시나리오

- 상세 관리 및 상태 전이
- Submit/Approve 워크플로우
- 카테고리별 필터링
- 마감일 중심 관리

#### 주요 기능

**1. 카테고리 선택**
- 좌측 Tabs에서 카테고리 선택
- 우측 테이블이 자동 필터링
- 진행률 표시: `approved/total`

**2. 상태 전이 버튼**
```
[Submit] → not_started → submitted
[Approve] → submitted → approved
```
- 가드 로직: `canTransition()` 확인
- 비활성화: 전이 불가 시 버튼 비활성

**3. 테이블 컬럼**
- **Document**: 제목 + 설명 + Priority Badge
- **Due**: 날짜 + D-카운트다운 + Due State Badge
- **Status**: Workflow 상태 Badge
- **Action**: Submit/Approve 버튼

---

## 마감일 계산 로직

### 개요

문서 마감일은 **Anchor Milestone**과 **Offset Days**로 계산됩니다. 일정 변경 시 마감일이 자동으로 재계산됩니다.

### 핵심 개념

#### Anchor Milestone (기준 마일스톤)

Voyage의 주요 이벤트 날짜를 기준으로 사용합니다:

```typescript
type MilestoneKey =
  | "mzp_arrival"      // MZP 도착일
  | "mzp_departure"    // MZP 출발일
  | "loadout_start"    // 적재 시작일
  | "loadout_end"      // 적재 완료일
  | "agi_arrival"      // AGI 도착일
  | "agi_departure"    // AGI 출발일
  | "doc_deadline"     // 문서 제출 마감일 (명시적)
```

**마일스톤 추출**:
- Gantt 일정에서 작업명 패턴으로 자동 추출
- 설정: `data/milestone-map.json`
- 예: `"LCT Arrives|Deck Preparations|MZP Arrival"` → `mzp_arrival`

#### Offset Days (오프셋 일수)

Anchor 날짜로부터의 상대 일수:

- **음수** (`-4`): Anchor 이전 4일
- **양수** (`+2`): Anchor 이후 2일
- **`0`**: Anchor 당일

#### Offset Type (오프셋 타입)

두 가지 계산 방식:

1. **`calendar_days`** (캘린더 일수)
   - 주말 포함
   - 예: `-4` = Anchor 4일 전

2. **`business_days`** (영업일)
   - 주말 제외 (토/일)
   - 예: `-4` = Anchor 이전 영업일 4일

### 계산 로직

#### 1. Anchor 날짜 조회

```typescript
const milestoneKey = template.anchor.milestoneKey  // 예: "mzp_arrival"
const milestoneDateStr = voyage.milestones[milestoneKey]  // "2026-01-26"
```

마일스톤이 없으면 `null` 반환.

#### 2. Offset 적용

```typescript
const anchorDate = new Date(milestoneDateStr)  // 2026-01-26
const offsetDays = template.anchor.offsetDays  // -4
const offsetType = template.anchor.offsetType  // "calendar_days"

// calendar_days: 단순 날짜 더하기
if (offsetType === "calendar_days") {
  dueAt = addCalendarDays(anchorDate, offsetDays)  // 2026-01-22
}

// business_days: 주말 제외
if (offsetType === "business_days") {
  dueAt = addBusinessDays(anchorDate, offsetDays)  // 주말 제외 계산
}
```

#### 3. Business Days 계산 알고리즘

```typescript
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let remaining = Math.abs(days)
  const direction = days > 0 ? 1 : -1  // 양수=미래, 음수=과거

  while (remaining > 0) {
    result.setDate(result.getDate() + direction)
    if (!isWeekend(result)) {  // 토/일 제외
      remaining--
    }
  }
  return result
}
```

### 예시

#### 예시 1: Calendar Days

```json
{
  "anchor": {
    "milestoneKey": "mzp_arrival",
    "offsetDays": -4,
    "offsetType": "calendar_days"
  }
}
```

- **MZP Arrival**: `2026-01-26` (화요일)
- **계산**: `2026-01-26 - 4일 = 2026-01-22` (금요일)
- **결과**: `2026-01-22`

#### 예시 2: Business Days

```json
{
  "anchor": {
    "milestoneKey": "loadout_start",
    "offsetDays": -3,
    "offsetType": "business_days"
  }
}
```

- **Load-out Start**: `2026-01-29` (금요일)
- **계산**:
  - 1일 전: `2026-01-28` (목요일) ✓
  - 2일 전: `2026-01-27` (수요일) ✓
  - 3일 전: `2026-01-26` (화요일) ✓
- **결과**: `2026-01-26` (주말 제외)

#### 예시 3: 주말 포함 시나리오

```json
{
  "anchor": {
    "milestoneKey": "mzp_departure",
    "offsetDays": -2,
    "offsetType": "business_days"
  }
}
```

- **MZP Departure**: `2026-02-01` (일요일)
- **계산**:
  - 1일 전: `2026-01-31` (토요일) → 주말 제외
  - 2일 전: `2026-01-30` (금요일) ✓
- **결과**: `2026-01-30`

### Due State 계산

마감일 기준 상태:

```typescript
const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

if (daysUntilDue < 0) return "overdue"      // 지난 경우
if (daysUntilDue <= 2) return "at_risk"     // 2일 이내
return "on_track"                            // 여유 있음
```

**특수 케이스**:
- `workflowState === "approved"` 또는 `"waived"` → 항상 `"on_track"`

### 템플릿 정의 예시

```json
{
  "id": "ptw.risk_assessment",
  "title": "Risk Assessment",
  "anchor": {
    "milestoneKey": "mzp_arrival",
    "offsetDays": -4,
    "offsetType": "calendar_days"
  }
}
```

**의미**: "MZP 도착일 4일 전까지 제출"

### 자동 재계산

일정 변경 시:
1. Gantt 일정 업데이트
2. Voyage 마일스톤 재추출 (`deriveVoyagesFromScheduleData`)
3. 문서 마감일 자동 재계산 (`calculateDueDate`)
4. Due State 자동 업데이트 (`calculateDueState`)

---

## 하이브리드 레이아웃 사용 가이드

### 개요

DocumentChecklist는 두 가지 레이아웃을 제공합니다:
- **카드 뷰**: 카테고리별 카드 그룹, 빠른 체크
- **테이블 뷰**: 좌측 카테고리 + 우측 테이블, 상세 관리

### 레이아웃 전환

#### 전환 버튼 위치

상단 우측에 두 개의 버튼:

```
┌─────────────────────────────────────┐
│                    [Card View] [Table View] │
└─────────────────────────────────────┘
```

- **활성 뷰**: `default` variant (강조)
- **비활성 뷰**: `outline` variant

#### 전환 방법

1. "Card View" 클릭 → 카드 뷰로 전환
2. "Table View" 클릭 → 테이블 뷰로 전환
3. **기본값**: 카드 뷰

### 카드 뷰 (Card View)

#### 레이아웃 구조

```
┌─────────────────────────────────────┐
│ Category 1 (Progress: 5/10)        │
│ ┌─────────────────────────────────┐ │
│ │ [✓] Document Name               │ │
│ │    [Badge] Priority             │ │
│ │    Due: 2026-01-22 [D-3]       │ │
│ │    [Badge] On Track             │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ [ ] Document Name               │ │
│ │    ...                          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Category 2 (Progress: 2/5)          │
│ ...                                 │
└─────────────────────────────────────┘
```

#### 특징

- 카테고리별 Card 그룹
- 체크박스로 `approved` 상태 토글
- D-카운트다운 Badge 표시
- Due State Badge (On Track/At Risk/Overdue)
- Progress Bar (카테고리별 완료율)

#### 사용 시나리오

✅ **추천 사용 사례**:
- 빠른 체크
- 전체 문서 개요 확인
- 카테고리별 진행률 확인
- 간단한 승인/미승인 토글

#### 주요 기능

**1. 체크박스 토글**
```
[✓] → approved
[ ] → in_progress
```
- 클릭 시 `updateDoc` 호출
- History 자동 추가

**2. D-카운트다운 표시**
- `D-3`: 3일 남음
- `Due today`: 오늘
- `Overdue 2d`: 2일 지남
- Badge로 표시 (Overdue 시 빨간색 강조 + AlertTriangle 아이콘)

**3. Due State Badge**
- `On Track`: 초록색
- `At Risk`: 노란색
- `Overdue`: 빨간색

### 테이블 뷰 (Table View)

#### 레이아웃 구조

```
┌──────────────┬────────────────────────────┐
│ Categories   │ Documents Table            │
│ (좌측 4열)    │ (우측 8열)                  │
├──────────────┼────────────────────────────┤
│ [PTW Pack]   │ Document │ Due │ Status │ Action│
│  5/10        │ ─────────┼─────┼────────┼───────┤
│              │ Doc 1    │ D-3 │ Submit │ [Submit]│
│ [Loading]    │ Doc 2    │ D-1 │ Approve│ [Approve]│
│  2/5         │ ...      │ ... │ ...    │ ... │
│              │                            │
│ [NOC]        │                            │
│  0/6         │                            │
└──────────────┴────────────────────────────┘
```

#### 특징

- 좌측: 카테고리 탭 (Tabs)
- 우측: 문서 테이블 (4개 컬럼)
- Submit/Approve 버튼으로 상태 전이
- D-카운트다운 + Due State 표시
- 카테고리별 진행률 표시 (좌측 탭)

#### 사용 시나리오

✅ **추천 사용 사례**:
- 상세 관리
- 상태 전이 (Submit/Approve)
- 카테고리별 필터링
- 마감일 중심 관리
- D-카운트다운 확인

#### 주요 기능

**1. 카테고리 선택**
- 좌측 Tabs에서 카테고리 선택
- 우측 테이블이 자동 필터링
- 진행률 표시: `approved/total`

**2. 상태 전이 버튼**
```
[Submit] → not_started → submitted
[Approve] → submitted → approved
```
- 가드 로직: `canTransition()` 확인
- 비활성화: 전이 불가 시 버튼 비활성

**3. 테이블 컬럼**
- **Document**: 제목 + 설명 + Priority Badge
- **Due**: 날짜 + D-카운트다운 + Due State Badge
- **Status**: Workflow 상태 Badge
- **Action**: Submit/Approve 버튼

**4. D-카운트다운 표시**
- 테이블 뷰에서도 Badge로 표시
- Overdue 시 빨간색 강조

---

## 상태 머신 워크플로우

### 상태 전이

```
not_started ──[Submit]──> submitted ──[Approve]──> approved
     │                              │
     └──────────────────────────────┘
          (종료 상태, 더 이상 전이 불가)
```

### 가드 규칙

| 현재 상태 | Submit | Approve |
|---------|--------|---------|
| `not_started` | ✅ | ❌ |
| `submitted` | ❌ | ✅ |
| `approved` | ❌ | ❌ |

### History 자동 추가

상태 변경 시 자동 기록:

```typescript
{
  at: "2026-01-20T10:30:00Z",
  event: "STATE_SUBMITTED"  // 또는 "STATE_APPROVED"
}
```

### 구현 위치

- **상태 전이 로직**: `lib/documents/workflow.ts`
  - `canTransition()`: 전이 허용 여부 확인
  - `transitionStatus()`: 상태 전이 수행
  - `statusLabel()`: 상태를 읽기 쉬운 텍스트로 변환
- **상태 업데이트**: `contexts/voyage-context.tsx`
  - `updateDoc()`: 문서 상태 업데이트 및 History 자동 추가

---

## 사용 권장사항

### 카드 뷰 사용 시

- ✅ 빠른 체크
- ✅ 전체 문서 개요
- ✅ 카테고리별 진행률 확인
- ✅ 간단한 승인/미승인 토글

### 테이블 뷰 사용 시

- ✅ 상세 관리
- ✅ Submit/Approve 워크플로우
- ✅ 카테고리별 필터링
- ✅ 마감일 중심 관리
- ✅ D-카운트다운 확인

### 접근성

- **키보드 접근성**: Tab으로 버튼 간 이동, Enter/Space로 활성화
- **화살표 키**: 카테고리 탭 이동 (테이블 뷰)
- **반응형 디자인**:
  - 모바일: 카드 뷰 권장
  - 태블릿: 두 뷰 모두 사용 가능
  - 데스크톱: 테이블 뷰 권장 (더 많은 정보 표시)

---

## Docs Progress Overlay

### 개요

Gantt Chart의 Trip row 위에 문서 진행률을 시각화하는 오버레이입니다. 클릭하면 해당 Voyage의 문서 목록으로 바로 이동할 수 있습니다.

### 위치

- **통합 위치**: Trip group header row (Gantt Chart 탭)
- **표시 조건**: 해당 Trip에 매칭되는 Voyage가 있고, 문서가 1개 이상인 경우

### 시각적 요소

- **Progress bar**:
  - 배경: `bg-muted/40`
  - 진행률: `bg-emerald-500/80` (초록색)
  - 높이: `h-2` (2px)
- **Badge**:
  - 텍스트: `Docs X/Y` (Approved/Total)
  - 스타일: `variant="outline"`, `text-[9px]`
  - 배경: `bg-background/90 backdrop-blur-sm`

### 인터랙션

#### 마우스 클릭
1. Overlay 클릭
2. 해당 Voyage 자동 선택 (`setSelectedVoyageId`)
3. Docs 탭으로 자동 전환 (`setActiveTab("docs")`)
4. 해당 Voyage의 문서 목록 표시

#### 키보드 네비게이션
1. Tab 키로 overlay에 포커스 이동
2. 포커스 링 표시 (3px ring, ring-offset-2)
3. Enter 또는 Space로 활성화
4. 해당 Voyage 선택 + Docs 탭 전환

### 접근성

- `role="button"` 설정
- `tabIndex={0}` 설정
- `aria-label`: `View documents for {voyageId} ({approved}/{total} approved)`
- 키보드 이벤트 핸들러 (`onKeyDown`)
- 포커스 링 스타일 (WCAG 준수)

### Voyage 매칭

- `tripGroupKey === group.activityId2`로 매칭
- 매칭 실패 시 overlay 표시 안 함

---

## 사용 시나리오

### 시나리오 1: 빠른 체크 (카드 뷰)

1. Documents 탭 열기
2. 카드 뷰에서 카테고리별 문서 확인
3. 체크박스로 승인/미승인 토글
4. D-카운트다운으로 마감일 확인

### 시나리오 2: 상세 관리 (테이블 뷰)

1. Documents 탭 열기
2. "Table View" 버튼 클릭
3. 좌측에서 카테고리 선택
4. 우측 테이블에서 문서 확인
5. "Submit" 버튼으로 제출
6. "Approve" 버튼으로 승인

### 시나리오 3: Gantt에서 문서 확인

1. Gantt Chart 탭에서 Trip row 확인
2. Docs progress overlay 확인 (Approved/Total 비율)
3. Overlay 클릭 (또는 Tab + Enter)
4. Docs 탭으로 자동 전환
5. 해당 Voyage의 문서 목록 표시

### 시나리오 4: 마감일 중심 관리

1. 테이블 뷰로 전환
2. "Due" 컬럼으로 정렬 (수동 또는 자동)
3. D-카운트다운으로 우선순위 확인
4. Overdue 문서부터 처리

---

## FAQ

### Q1: 마감일이 자동으로 계산되나요?

A: 네. Gantt 일정의 마일스톤을 기준으로 자동 계산됩니다. 일정이 변경되면 마감일도 자동으로 재계산됩니다.

### Q2: Business Days와 Calendar Days의 차이는?

A: Business Days는 주말(토/일)을 제외하고 계산하며, Calendar Days는 주말을 포함합니다.

### Q3: 상태를 되돌릴 수 있나요?

A: 현재 MVP에서는 되돌리기 기능이 없습니다. `approved` 상태는 종료 상태로 취급됩니다.

### Q4: 카드 뷰와 테이블 뷰 중 어떤 것을 사용해야 하나요?

A: 빠른 체크는 카드 뷰, 상세 관리 및 상태 전이는 테이블 뷰를 권장합니다.

### Q5: D-카운트다운은 어떻게 표시되나요?

A: `D-N` (N일 남음), `Due today` (오늘), `Overdue Nd` (N일 지남) 형식으로 Badge에 표시됩니다.

### Q6: Docs Progress Overlay는 어떻게 사용하나요?

A: Gantt Chart의 Trip row 위에 표시되는 progress bar를 클릭하면 해당 Voyage의 문서 목록으로 이동합니다. 키보드로도 접근 가능합니다 (Tab + Enter/Space).

---

## 관련 문서

- [시스템 레이아웃](../SYSTEM_LAYOUT.md) - 전체 시스템 구조
- [컴포넌트 상세 레이아웃](../COMPONENTS_LAYOUT_DETAIL.md) - 컴포넌트별 상세 정보
- [시스템 아키텍처](../SYSTEM_ARCHITECTURE_KO.md) - 기술 아키텍처

---

## 관련 파일

- `components/documents/document-checklist.tsx`: 메인 컴포넌트
- `lib/documents/deadline-engine.ts`: 마감일 계산 로직
- `lib/documents/workflow.ts`: 상태 전이 로직
- `contexts/voyage-context.tsx`: 상태 관리
- `data/doc-templates.json`: 문서 템플릿 정의

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2026-01-19
**유지보수자**: 개발 팀
