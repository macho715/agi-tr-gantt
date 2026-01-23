# /guard theme
Deep Ocean Theme(전역 CSS) 및 조립 패턴 변경을 방지하기 위한 체크리스트/가드.

## Checklist
- `app/globals.css`: 색상 변수/그라데이션/오버레이/스크롤바 변경 여부 확인
- `app/layout.tsx`: lang/className/dark 고정 유지 여부 확인
- `app/page.tsx`: 섹션 조립 순서 유지 여부 확인
