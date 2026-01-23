# /validate
`package.json` scripts 존재 여부에 따라, 실행 가능한 검증만 순서대로 수행한다(추측 금지).

## Run
```bash
node tools/run_validate.mjs
```

## Behavior
- lockfile로 PM 확정
- install → lint → typecheck → test → build 순서로, **스크립트 존재 시에만** 실행
- 스크립트 미존재 시 "확인 필요(Ask-first)"로 리포트
