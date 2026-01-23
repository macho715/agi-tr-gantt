## /logi-master --fast report

**범위:** Option C · **Next 7 days** = **2026-01-21 ~ 2026-01-28** (Asia/Dubai) 

### Exec (3–5L)

* Next 7 days 내 **실행 작업(leaf, activity_id 존재)**은 **7건**, 모두 **2026-01-26~2026-01-28**에 집중됩니다. 
* 2026-01-26: **MOB(해상/Steelworks) + 1st SPMT Assembly/Function Test** 시작.
* 2026-01-27~28: **Beam Replacement(TR Unit 1~2) + Deck Preparations** 진행(초기 운영창 형성).
* 데이터상 **DEMOBILIZATION(MARINE) 2026-01-27**이 조기 등장하므로, **라벨/의미 확인**이 필요합니다(데이터 무결성 리스크). 

---

## 규칙(대시보드 고정 문구/로직)

1. **윈도우:** `today(YYYY-MM-DD) ~ today+7d` (포함)
2. **포함 조건:** `planned_start <= window_end AND planned_finish >= today` (겹치면 포함)
3. **우선순위:** (1) `activity_id != null`(실행) → (2) phase/summary(`activity_id == null`)는 “참고(ongoing)”로 분리
4. **정렬:** `planned_start ASC → planned_finish ASC → level1 → level2`
5. **태그:** `activity_name` 키워드 기반 자동 태깅(예: SPMT / Marine/Steelworks / Beam/Twistlocks / Deck Prep)
6. **리스크 플래그:**

   * `DEMOBILIZATION`이 프로젝트 초반(예: start < mobilization_finish) 출현 시 **DataLabelRisk=HIGH**
   * `duration <= 0` 또는 날짜 역전 시 **ScheduleIntegrity=FAIL**

---

## Visual-first (Next 7 days 실행 작업 7건)

| No | Date       | ID    | Lane(level1/level2)             | Task                                                     | Dur(d) | Tag                      | Risk               |
| -: | ---------- | ----- | ------------------------------- | -------------------------------------------------------- | -----: | ------------------------ | ------------------ |
|  1 | 2026-01-26 | A1001 | MOBILIZATION / MARINE           | Mobilization of Marine Equipment and Steelworks          |   0.50 | Marine/Steelworks,MOB    | LOW                |
|  2 | 2026-01-26 | A1000 | MOBILIZATION / SPMT             | Mobilization of 1st set of SPMT; Asembly + Function test |   1.00 | SPMT,MOB                 | LOW                |
|  3 | 2026-01-27 | A2000 | DEMOBILIZATION / MARINE         | Demobilization of Marine Equipment and Steelworks        |   1.00 | Marine/Steelworks,De-MOB | **HIGH(라벨 확인 필요)** |
|  4 | 2026-01-27 | A1002 | OPERATIONAL / Beam Replacement  | Beam Replacement AGI TR Unit 1 (TR Bay 4) - Twistlocks   |   1.00 | Beam/Twistlocks          | MED(초기 병목)         |
|  5 | 2026-01-27 | A1004 | OPERATIONAL / Deck Preparations | Deck Preparations (D-ring cutting; marking, …)           |   1.00 | Deck Prep                | MED(초기 병목)         |
|  6 | 2026-01-28 | A1003 | OPERATIONAL / Beam Replacement  | Beam Replacement AGI TR Unit 2 (TR Bay 3) - Twistlocks   |   1.00 | Beam/Twistlocks          | MED                |
|  7 | 2026-01-28 | A1005 | OPERATIONAL / Deck Preparations | Deck Preparations (Steel sets installation, …)           |   1.00 | Deck Prep                | MED                |

### 참고(ongoing/phase)

* MOBILIZATION(Phase) 2026-01-26~2026-02-04 (10.00d) 
* SPMT(Phase) 2026-01-26~2026-02-04 (10.00d) 

---

## Options A/B/C (운영 적용 방식)

* **A (최소):** 위 7건만 “Next 7 days” 카드로 노출 + 태그 필터(SPMT/Deck/Beam)
* **B (권장):** A + **DataLabelRisk** 자동 경고(DEMOB 조기 출현) + “오너/담당” 입력 필드
* **C (확장):** B + Docs/PTW 오버레이 연동(문서 due와 동일 윈도우에 표시)

---

## Steps (P→Pi→B→O→S + KPI)

* **P:** 규칙 1~6 고정, Next7 JSON 생성
* **Pi:** DEMOB 조기 라벨 1건만 경고 띄워 UX 검증
* **B:** 태그/필터/정렬 + Drilldown(체크리스트)
* **O:** “48h 임박” 자동 pin, KPI=Next Action 클릭수 ≤2
* **S:** A/B/C 옵션 비교(피크 작업/병목/리스크) KPI=의사결정 리드타임 30%↓(가정)

---

## 🔧/cmd3

* Now: `/logi-master --fast report` (완료: Next7 추출+규칙 고정)
* Next: `/switch_mode LATTICE + /logi-master --fast report` (라벨/데이터 무결성 플래그 강화)
* Alt: `/logi-master kpi-dash` (Next7 작업 집중도·병목 KPI)

---

## JSON (대시보드 삽입용, CSV-friendly)

```json
{
  "meta": {
    "source": "option_c.json",
    "tz": "Asia/Dubai",
    "window_start": "2026-01-21",
    "window_end": "2026-01-28",
    "leaf_count": 7
  },
  "next7_leaf": [
    {"date":"2026-01-26","id":"A1001","level1":"MOBILIZATION","level2":"MARINE","dur_d":0.50,"tag":"Marine/Steelworks,MOB","risk":"LOW"},
    {"date":"2026-01-26","id":"A1000","level1":"MOBILIZATION","level2":"SPMT","dur_d":1.00,"tag":"SPMT,MOB","risk":"LOW"},
    {"date":"2026-01-27","id":"A2000","level1":"DEMOBILIZATION","level2":"MARINE","dur_d":1.00,"tag":"Marine/Steelworks,De-MOB","risk":"HIGH_LABEL_CHECK"},
    {"date":"2026-01-27","id":"A1002","level1":"OPERATIONAL","level2":"Beam Replacement","dur_d":1.00,"tag":"Beam/Twistlocks","risk":"MED"},
    {"date":"2026-01-27","id":"A1004","level1":"OPERATIONAL","level2":"Deck Preparations","dur_d":1.00,"tag":"Deck Prep","risk":"MED"},
    {"date":"2026-01-28","id":"A1003","level1":"OPERATIONAL","level2":"Beam Replacement","dur_d":1.00,"tag":"Beam/Twistlocks","risk":"MED"},
    {"date":"2026-01-28","id":"A1005","level1":"OPERATIONAL","level2":"Deck Preparations","dur_d":1.00,"tag":"Deck Prep","risk":"MED"}
  ]
}
```

---

## ZERO log

* 해당 없음 (데이터 추출/요약 단계). 단, **DEMOB 라벨 조기 출현**은 “무결성 경고”로 처리(중단 사유 아님).
